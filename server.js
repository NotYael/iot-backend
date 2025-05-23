import express from "express";
import pool from "./db.js";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

// Configure CORS for both development and production
const allowedOrigins = [
  "http://localhost:4000", // Local development
  "https://ecoloop-sage.vercel.app", // Vercel deployment
];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Add Socket.IO connection handler
const userSockets = new Map(); // Keep track of user sockets

io.on("connection", (socket) => {
  console.log(`New socket connection: ${socket.id}`);

  socket.on("registerUser", (rfid) => {
    console.log(`User registering with RFID: ${rfid}, Socket ID: ${socket.id}`);

    // Store the socket ID with the RFID
    if (!userSockets.has(rfid)) {
      userSockets.set(rfid, new Set());
    }
    userSockets.get(rfid).add(socket.id);

    // Join the room
    socket.join(rfid);
    console.log(
      `Current connections for RFID ${rfid}: ${userSockets.get(rfid).size}`
    );

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Socket disconnecting: ${socket.id} for RFID: ${rfid}`);
      userSockets.get(rfid)?.delete(socket.id);
      if (userSockets.get(rfid)?.size === 0) {
        userSockets.delete(rfid);
      }
      console.log(
        `Remaining connections for RFID ${rfid}: ${
          userSockets.get(rfid)?.size || 0
        }`
      );
    });
  });
});

const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// THIS IS JUST TO TEST DB CONNECTION
// app.get("/", async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM users where rfid = 'Hello';"
//     );
//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.log(`Error connecting to the database: ${err}`);
//     res.status(500).json({ error: "Error fetching users" });
//   }
// });

// **** USERS *****
app.post("/add_user", async (req, res) => {
  const { rfid, name, email, password, balance, permission } = req.body;
  try {
    const queryText =
      "INSERT INTO users (rfid, name, email, password, balance, permission) VALUES ($1, $2, $3, $4, $5, $6)";
    await pool.query(queryText, [
      rfid,
      name,
      email,
      password,
      balance,
      permission,
    ]);
    console.log(`User added successfully: ${rfid}, ${name}, ${email}`);
    res.status(200).send("User added successfully");
  } catch (err) {
    console.log(`Error adding user: ${err}`);
    if (err.code === "23505") {
      const field = err.constraint.includes("rfid") ? "RFID" : "email";
      res.status(409).json({
        error: `${field} already exists`,
        details: `A user with this ${field.toLowerCase()} is already registered`,
      });
    } else {
      res.status(500).json({ error: "Error Adding User" });
    }
  }
});

app.get("/get_user", async (req, res) => {
  const { email } = req.query;
  console.log(`Fetching user with email: ${email}`);
  try {
    const queryText = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(queryText, [email]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.log(`Error fetching user: ${err}`);
    res.status(500).json({ error: "Error fetching user" });
  }
});

app.get("/get_user_by_rfid", async (req, res) => {
  const { rfid } = req.query;
  console.log(`Fetching RFID mapping for user with RFID: ${rfid}`);
  try {
    const queryText = "SELECT * FROM users WHERE rfid = $1";
    const result = await pool.query(queryText, [rfid]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      console.log(`RFID mapping not found for user with RFID: ${rfid}`);
      res.status(404).json({ error: "RFID mapping not found" });
    }
  } catch (err) {
    console.log(`Error fetching RFID mapping: ${err}`);
    res.status(500).json({ error: "Error fetching RFID mapping" });
  }
});

app.put("/edit_user_details", async (req, res) => {
  const { rfid, name, email } = req.body;
  console.log(`Updating user with rfid: ${rfid}`);
  console.log(`New name: ${name}, New email: ${email}`);
  try {
    const queryText = "UPDATE users SET name = $1, email = $2 WHERE rfid = $3";
    await pool.query(queryText, [name, email, rfid]);
    res.status(200).send("User updated successfully");
  } catch (err) {
    console.log(`Error updating user: ${err}`);
    res.status(500).json({ error: "Error Updating User" });
  }
});

app.put("/edit_user_password", async (req, res) => {
  const { rfid, password } = req.body;
  try {
    const queryText = "UPDATE users SET password = $1 WHERE rfid = $2";
    await pool.query(queryText, [password, rfid]);
    res.status(200).send("User password updated successfully");
  } catch (err) {
    console.log(`Error updating user: ${err}`);
    res.status(500).json({ error: "Error Updating User" });
  }
});

// ***** ACCOUNT BALANCE *****
app.get("/get_user_balance", async (req, res) => {
  const { rfid } = req.query;
  console.log(`Fetching balance for user with rfid: ${rfid}`);
  try {
    const queryText = "SELECT * FROM users WHERE rfid = $1";
    const result = await pool.query(queryText, [rfid]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0].balance);
    } else {
      res.status(404).json({ error: "Account balance not found" });
    }
  } catch (err) {
    console.log(`Error fetching account balance: ${err}`);
    res.status(500).json({ error: "Error fetching account balance" });
  }
});

app.post("/update_user_balance", async (req, res) => {
  const { rfid, balance } = req.body;

  try {
    const queryText = "SELECT * FROM users WHERE rfid = $1";
    const result = await pool.query(queryText, [rfid]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const userBalance = user.balance;
      const newBalance = parseInt(userBalance) + parseInt(balance);
      try {
        const updateQuery =
          "UPDATE users SET balance = $2 WHERE rfid = $1 RETURNING *";
        const updateResult = await pool.query(updateQuery, [rfid, newBalance]);

        // Emit to all sockets in the room
        io.in(rfid).emit("balanceUpdate", {
          rfid: rfid,
          newBalance: newBalance,
        });

        res.status(200).send("Balance updated successfully");
      } catch (err) {
        console.log(`Error updating balance in database: ${err}`);
        res.status(500).json({ error: "Error Adding Account Balance" });
      }
    } else {
      console.log(`No user found with RFID: ${rfid}`);
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.log(`Error fetching user: ${err}`);
    res.status(500).json({ error: "Error fetching user" });
  }
});

// **** TRANSACTIONS *****
app.get("/transactions", async (req, res) => {
  const { rfid } = req.query;
  console.log(`Fetching transactions for user with rfid: ${rfid}`);
  try {
    const queryText = "SELECT * FROM transaction_history WHERE rfid = $1";
    const result = await pool.query(queryText, [rfid]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).json({ error: "Transactions not found" });
    }
  } catch (err) {
    console.log(`Error fetching transactions: ${err}`);
    res.status(500).json({ error: "Error fetching transactions" });
  }
});

app.post("/add_transaction", async (req, res) => {
  const { rfid, transaction_type, bottle_count, balance_modified } = req.body;
  const transaction_date = new Date().toISOString();
  try {
    const queryText =
      "INSERT INTO transaction_history (rfid, transaction_date, transaction_type, bottle_count, balance_modified) VALUES ($1, $2, $3, $4, $5)";
    await pool.query(queryText, [
      rfid,
      transaction_date,
      transaction_type,
      bottle_count,
      balance_modified,
    ]);
    console.log(
      `Transaction added successfully: ${rfid}, ${transaction_date}, ${transaction_type}, bottle count: ${bottle_count}, balance modified: ${balance_modified}`
    );
    res.status(200).send("Transaction added successfully");
  } catch (err) {
    console.log(`Error adding transaction: ${err}`);
    res.status(500).json({ error: "Error Adding Transaction" });
  }
});

// ***** APIs *****

app.post("/bottle", async (req, res) => {
  const { bottle } = req.body;

  try {
    console.log(`AI: Checking bottle...`);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "ONLY answer TRUE or FALSE. Is this image a plastic bottle — in any condition or size? Labels do not matter. Use shape and presence of a cap if unclear.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${bottle}`,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result =
      response.data?.choices?.[0]?.message?.content || "No response";
    if (result === "TRUE") {
      res.status(200).send("TRUE");
      console.log(`Bottle accepted`);
    } else {
      res.status(400).send("FALSE");
      console.log(`Bottle rejected`);
    }
  } catch (err) {
    console.log(`ChatGPT Error: ${err}`);
    res.status(500).json({ error: "ChatGPT Error" });
  }
});

app.post("/voucher", async (req, res) => {
  const { email, voucher_code } = req.body;

  console.log(`Sending email to ${email} with voucher code ${voucher_code}`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Voucher Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2e7d32; margin-bottom: 10px;">Thank You for Recycling!</h1>
          <p style="color: #666; font-size: 16px;">Your recycling efforts help make our planet greener.</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h2 style="color: #1b5e20; margin-top: 0;">Your Voucher Code</h2>
          <div style="background-color: white; padding: 15px; border-radius: 4px; text-align: center; font-size: 24px; font-weight: bold; color: #2e7d32; letter-spacing: 2px;">
            ${voucher_code}
          </div>
        </div>

        <div style="color: #666; font-size: 14px; margin-top: 20px;">
          <p>Please keep this code safe. You can use it to redeem your rewards.</p>
          <p style="margin-top: 10px;">Thank you for your contribution to a sustainable future!</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email sent successfully");
  } catch (err) {
    res.status(500).json({ error: "Error sending email" });
  }
});

app.post("/accept_bottle", async (req, res) => {
  const { bottle } = req.body;
  console.log(`TEST: Accepting bottle`);
  res.status(200).send("TRUE");
});

app.post("/reject_bottle", async (req, res) => {
  const { bottle } = req.body;
  console.log(`TEST: Rejecting bottle`);
  res.status(404).send("FALSE");
});

httpServer.listen(port, () => {
  console.log(`Backend online!`);
});
