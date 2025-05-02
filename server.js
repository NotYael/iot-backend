import express from 'express';
import pool from './db.js';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const port = 4000;

/* 
TODO: IMPLEMENT THE FOLLOWING
DATABASE:
[] Merge users and balance tables into one table
 
CHATGPT:
[] Translate Python code to JS

EMAIL:
[] Send email to user for vouchers
*/

// Middleware 
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

// THIS IS JUST TO TEST DB CONNECTION
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users;');
    res.json(result.rows);
  } catch (err) {
    console.log(`Error connecting to the database: ${err}`);
    res.status(500).json({ error: 'Error fetching users' });
  }
});


// **** USERS *****
app.post('/add_user', async (req, res) => {
    const {name, password, email, balance } = req.body;
    try {
      const queryText = "INSERT INTO users (name, password, email, balance) VALUES ($1, $2, $3, $4)";
      await pool.query(queryText, [name, password, email, balance]);
      res.send("User added successfully");
    } catch (err) {
      console.log(`Error adding user: ${err}`);
      res.status(500).json({ error: 'Error Adding User' });
    }
});

app.get('/get_user', async (req, res) => {
    const { email } = req.query;
    console.log(`Fetching user with id: ${email}`);
    try {
      const queryText = "SELECT * FROM users WHERE email = $1";
      const result = await pool.query(queryText, [email]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
        console.log(`Error fetching user: ${err}`);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

app.put('/edit_user_details', async (req, res) => {
    const { id, name, email } = req.body;
    console.log(`Updating user with id: ${id}`);
    console.log(`New name: ${name}, New email: ${email}`);
    try {
      const queryText = "UPDATE users SET name = $1, email = $2 WHERE id = $3";
      await pool.query(queryText, [name, email, id]);
      res.send("User updated successfully");
    } catch (err) {
      console.log(`Error updating user: ${err}`);
      res.status(500).json({ error: 'Error Updating User' });
    }
});

app.put('/edit_user_password', async (req, res) => {
    const { id, password } = req.body;
    try {
      const queryText = "UPDATE users SET password = $1 WHERE id = $2";
      await pool.query(queryText, [password, id]);
      res.send("User password updated successfully");
    } catch (err) {
      console.log(`Error updating user: ${err}`);
      res.status(500).json({ error: 'Error Updating User' });
    }
});


// ***** ACCOUNT BALANCE *****
app.get('/get_user_balance', async (req, res) => {
    const { id } = req.query;
    console.log(`Fetching balance for user with id: ${id}`);
    try {
      const queryText = "SELECT * FROM users WHERE id = $1";
      const result = await pool.query(queryText, [id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0].balance);
      } else {
        res.status(404).json({ error: 'Account balance not found' });
      }
    } catch (err) {
        console.log(`Error fetching account balance: ${err}`);
        res.status(500).json({ error: 'Error fetching account balance' });
    }
});

app.post('/update_user_balance', async (req, res) => {
    const { id, balance } = req.body;
  
    // Get User First
    try {
      const queryText = "SELECT * FROM users WHERE id = $1";
      const result = await pool.query(queryText, [id]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const userBalance = user.balance
        const newBalance = parseFloat(userBalance) + parseFloat(balance);

        try {
          const queryText = "UPDATE users SET balance = $2 WHERE id = $1";
          await pool.query(queryText, [id, newBalance]);
          res.send("Account balance updated successfully");
        } catch (err) {
          console.log(`Error adding account balance: ${err}`);
          res.status(500).json({ error: 'Error Adding Account Balance' });
        }
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
        console.log(`Error fetching user: ${err}`);
        res.status(500).json({ error: 'Error fetching user' });
    }


});

// **** TRANSACTIONS ***** 
app.get('/transactions', async (req, res) => {
    const { id } = req.query;
    console.log(`Fetching transactions for user with id: ${id}`);
    try {
      const queryText = "SELECT * FROM transaction_history WHERE user_id = $1";
      const result = await pool.query(queryText, [id]);
      if (result.rows.length > 0) {
        res.json(result.rows);
      } else {
        res.status(404).json({ error: 'Transactions not found' });
      }
    } catch (err) {
        console.log(`Error fetching transactions: ${err}`);
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

app.post('/add_transaction', async (req, res) => {
    const { user_id, transaction_date, transaction_type, bottle_count, balance_added, balance_deducted} = req.body;
    try {
        const queryText = "INSERT INTO transaction_history (user_id, transaction_date, transaction_type, bottle_count, balance_added, balance_deducted) VALUES ($1, $2, $3, $4, $5, $6)";
        await pool.query(queryText, [user_id, transaction_date, transaction_type, bottle_count, balance_added, balance_deducted]);
        res.send("Transaction added successfully");
    } catch (err) {
        console.log(`Error adding transaction: ${err}`);
        res.status(500).json({ error: 'Error Adding Transaction' });
    }
});

// ***** RFIF MAPPING *****

app.get('/rfid_mapping', async (req, res) => {
  const { rfid_hex } = req.query;
  console.log(`Fetching RFID mapping for user with id: ${rfid_hex}`);
  try {
    const queryText = "SELECT * FROM rfid_mapping WHERE rfid_hex = $1";
    const result = await pool.query(queryText, [rfid_hex]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      
      res.status(404).json({ error: 'RFID mapping not found' });
    }
  } catch (err) {
      console.log(`Error fetching RFID mapping: ${err}`);
      res.status(500).json({ error: 'Error fetching RFID mapping' });
  }
});

app.post('/add_rfid_mapping', async (req, res) => {
    const { rfid_hex } = req.body;
    try {
      const queryText = "INSERT INTO rfid_mapping (rfid_hex) VALUES ($1)";
      await pool.query(queryText, [rfid_hex]);
      res.send("RFID mapping added successfully");
    } catch (err) {
      console.log(`Error adding RFID mapping: ${err}`);
      res.status(500).json({ error: 'Error Adding RFID Mapping' });
    }
});

app.listen(port, () => {
  console.log(`Backend running on Port ${port}`);
});