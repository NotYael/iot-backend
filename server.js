import express from "express";
import pool from "./db.js";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Configure CORS for both development and production
const allowedOrigins = [
  "http://localhost:4000", // Local development
  process.env.FRONTEND_URL, // Production frontend URL
];

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// THIS IS JUST TO TEST DB CONNECTION
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users;");
    res.json(result.rows);
  } catch (err) {
    console.log(`Error connecting to the database: ${err}`);
    res.status(500).json({ error: "Error fetching users" });
  }
});

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
    res.send("User added successfully");
  } catch (err) {
    console.log(`Error adding user: ${err}`);
    res.status(500).json({ error: "Error Adding User" });
  }
});

app.get("/get_user", async (req, res) => {
  const { email } = req.query;
  console.log(`Fetching user with email: ${email}`);
  try {
    const queryText = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(queryText, [email]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
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
      res.json(result.rows[0]);
    } else {
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
    res.send("User updated successfully");
  } catch (err) {
    console.log(`Error updating user: ${err}`);
    res.status(500).json({ error: "Error Updating User" });
  }
});

app.put("/edit_user_password", async (req, res) => {
  const { id, password } = req.body;
  try {
    const queryText = "UPDATE users SET password = $1 WHERE id = $2";
    await pool.query(queryText, [password, id]);
    res.send("User password updated successfully");
  } catch (err) {
    console.log(`Error updating user: ${err}`);
    res.status(500).json({ error: "Error Updating User" });
  }
});

// ***** ACCOUNT BALANCE *****
app.get("/get_user_balance", async (req, res) => {
  const { id } = req.query;
  console.log(`Fetching balance for user with id: ${id}`);
  try {
    const queryText = "SELECT * FROM users WHERE id = $1";
    const result = await pool.query(queryText, [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0].balance);
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
  console.log(
    `Updating balance for user with rfid: ${rfid}, reducing balance by ${balance}`
  );
  // Get User First
  try {
    const queryText = "SELECT * FROM users WHERE rfid = $1";
    const result = await pool.query(queryText, [rfid]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const userBalance = user.balance;
      const newBalance = parseInt(userBalance) + parseInt(balance);

      try {
        const queryText = "UPDATE users SET balance = $2 WHERE rfid = $1";
        await pool.query(queryText, [rfid, newBalance]);
        console.log(`New balance for user with rfid: ${rfid} is ${newBalance}`);
        res.send("Account balance updated successfully");
      } catch (err) {
        console.log(`Error adding account balance: ${err}`);
        res.status(500).json({ error: "Error Adding Account Balance" });
      }
    } else {
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
      res.json(result.rows);
    } else {
      res.status(404).json({ error: "Transactions not found" });
    }
  } catch (err) {
    console.log(`Error fetching transactions: ${err}`);
    res.status(500).json({ error: "Error fetching transactions" });
  }
});

app.post("/add_transaction", async (req, res) => {
  const {
    rfid,
    transaction_date,
    transaction_type,
    bottle_count,
    balance_modified,
  } = req.body;
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
      `Transaction added successfully: ${rfid}, ${transaction_date}, ${transaction_type}, ${bottle_count}, ${balance_modified}`
    );
    res.send("Transaction added successfully");
  } catch (err) {
    console.log(`Error adding transaction: ${err}`);
    res.status(500).json({ error: "Error Adding Transaction" });
  }
});

// ***** APIs *****

app.post("/bottle", async (req, res) => {
  const { bottle } = req.body;

  try {
    console.log(`Checking bottle`);
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
                text: "Is this image a photo of a plastic water bottle? I want the response to be a simple TRUE or FALSE.",
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
    res.json({ result });
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
    res.send("Email sent successfully");
  } catch (err) {
    res.status(500).json({ error: "Error sending email" });
  }
});

app.listen(port, () => {
  console.log(`Backend online!`);
});
