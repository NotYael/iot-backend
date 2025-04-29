import express from 'express';
import pool from './db.js';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

/* 
TODO: IMPLEMENT THE FOLLOWING
DATABASE:
[X] (GET) Get user by id
[X] (POST) Add new user
[X] (PUT) Update user details by id (name and email)
[X] (PUT) Update user password by id
[X] (POST) Create new account balance for new users
[X] (GET) Get user's account balance by id
[X] (UPDATE) Update user's account balance by id after transaction
[X] (GET) Get user's transaction list by id
[X] (POST) Add new transaction for user by id

CHATGPT:
[] Sent requests to ChatGPT API

EMAIL:
[] Send email to user for vouchers

*/

// Middleware 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

// THIS IS JUST TO TEST DB CONNECTION
// app.get('/', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM users;');
//     res.json(result.rows);
//   } catch (err) {
//     console.log(`Error connecting to the database: ${err}`);
//     res.status(500).json({ error: 'Error fetching users' });
//   }
// });


// **** USERS *****
app.post('/add_user', async (req, res) => {
    const { id, name, password, email } = req.body;
    try {
      const queryText = "INSERT INTO users (id, name, password, email) VALUES ($1, $2, $3, $4)";
      await pool.query(queryText, [id, name, password, email]);
      res.send("User added successfully");
    } catch (err) {
      console.log(`Error adding user: ${err}`);
      res.status(500).json({ error: 'Error Adding User' });
    }
});

app.get('/user', async (req, res) => {
    const { id } = req.query;
    console.log(`Fetching user with id: ${id}`);
    try {
      const queryText = "SELECT * FROM users WHERE id = $1";
      const result = await pool.query(queryText, [id]);
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


// **** ACCOUNT BALANCE *****
app.post('/create_account_balance', async (req, res) => {
    const { id, balance } = req.body;
    try {
      const queryText = "INSERT INTO account_balance (id, balance) VALUES ($1, $2)";
      await pool.query(queryText, [id, balance]);
      res.send("Account balance added successfully");
    } catch (err) {
      console.log(`Error adding account balance: ${err}`);
      res.status(500).json({ error: 'Error Adding Account Balance' });
    }
});

app.get('/balance/', async (req, res) => {
    const { id } = req.query;
    console.log(`Fetching balance for user with id: ${id}`);
    try {
      const queryText = "SELECT * FROM account_balance WHERE id = $1";
      const result = await pool.query(queryText, [id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Account balance not found' });
      }
    } catch (err) {
        console.log(`Error fetching account balance: ${err}`);
        res.status(500).json({ error: 'Error fetching account balance' });
    }
});

app.post('/update_balance', async (req, res) => {
    const { id, balance } = req.body;
    try {
      const queryText = "INSERT INTO account_balance (id, balance) VALUES ($1, $2)";
      await pool.query(queryText, [id, balance]);
      res.send("Account balance added successfully");
    } catch (err) {
      console.log(`Error adding account balance: ${err}`);
      res.status(500).json({ error: 'Error Adding Account Balance' });
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

app.listen(port, () => {
  console.log(`Backend running on Port ${port}`);
});