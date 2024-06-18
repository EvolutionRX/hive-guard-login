const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { Decimal128 } = require('bson');
app.use(express.json());
app.use(cors());

const userDB = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}.rwqi8e6.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
const sensorDB = process.env.MONGODB_URI;
const port = process.env.PORT || 3000;

// Conectar a la base de datos principal
mongoose.connect(userDB, {})
    .then(() => console.log('Connected to Users MongoDB'))
    .catch(err => console.error('Failed to connect to Users MongoDB', err));

// Crear una conexión separada para la base de datos secundaria
const sensorDBConnection = mongoose.createConnection(sensorDB, {
    maxPoolSize: process.env.MONGODB_MAX_POOL,
    serverSelectionTimeoutMS: 10000
});

sensorDBConnection.once('open', () => {
    console.log('Connected to Sensor MongoDB');
});

sensorDBConnection.on('error', (err) => {
    console.error('Failed to connect to Sensor MongoDB', err);
});

// Esquema y modelo para la base de datos principal
const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Esquemas y modelos para la base de datos secundaria
const sensorSchema = new mongoose.Schema({
    sensorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    temp: Number,
    hum: Number
});
const Sensor = sensorDBConnection.model('Sensor', sensorSchema);

const sensorDetectionSchema = new mongoose.Schema({
    sensorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    varroa_score: { type: Decimal128 },
    pollen_score: { type: Decimal128 },
    wasps_score: { type: Decimal128 },
    cooling_score: { type: Decimal128 }
});
const SensorDetection = sensorDBConnection.model('SensorDetection', sensorDetectionSchema);

const configSchema = new mongoose.Schema({
    username: { type: String, required: true },
    TEMP_MIN_THRESHOLD: { type: Number, required: true },
    TEMP_MAX_THRESHOLD: { type: Number, required: true },
    HUM_THRESHOLD: { type: Number, required: true }
});

const Config = mongoose.model('Config', configSchema);

// Endpoints para la base de datos principal
app.post('/register', async (req, res) => {
    const { Email, UserName, Password } = req.body;
    const user = new User({ email: Email, username: UserName, password: Password });

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

app.get('/api/users', async (req, res) => {
    const { username } = req.query;
    try {
        const user = await User.findOne({ username: username });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoints para la base de datos secundaria
app.get('/api/sensors', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: "Invalid Date" });
        }

        const sensors = await Sensor.find({
            timestamp: {
                $gte: start,
                $lte: end
            }
        });
        res.json(sensors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/sensordetections', async (req, res) => {
    try {
        const detections = await SensorDetection.find();
        res.json(detections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint para consultar la configuración existente
app.get('/api/config', async (req, res) => {
    const { username } = req.query;
    try {
        const config = await Config.findOne({ username: username });
        if (config) {
            res.json(config);
        } else {
            res.status(404).json({ message: 'Configuration not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint para crear una nueva configuración
app.post('/api/setConfig', async (req, res) => {
    const { username, TEMP_MIN_THRESHOLD, TEMP_MAX_THRESHOLD, HUM_THRESHOLD } = req.body;
    try {
        const newConfig = new Config({
            username,
            TEMP_MIN_THRESHOLD,
            TEMP_MAX_THRESHOLD,
            HUM_THRESHOLD
        });
        await newConfig.save();
        res.status(200).send({ message: 'Configuration created successfully!' });
    } catch (error) {
        res.status(500).send({ message: 'Error creating configuration', error });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
