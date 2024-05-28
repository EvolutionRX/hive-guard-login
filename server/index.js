const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

app.use(express.json());
app.use(cors());

const url = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}.rwqi8e6.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
const port = process.env.PORT || 3000;

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch(err => console.error('Failed to connect to MongoDB', err));

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

app.post('/register', async (req, res) => {
    const { Email, UserName, Password } = req.body;

    const user = new User({
        email: Email,
        username: UserName,
        password: Password
    });

    try {
        await user.save();
        console.log('User inserted successfully!');
        res.send({ message: 'User added!' });
    } catch (err) {
        res.send(err);
    }
});

app.post('/login', async (req, res) => {
    const { LoginUserName, LoginPassword } = req.body;

    try {
        const user = await User.findOne({ username: LoginUserName, password: LoginPassword });
        if (user) {
            res.send(user);
        } else {
            res.send({ message: `Credentials don't match!` });
        }
    } catch (err) {
        res.send({ error: err });
    }
});
