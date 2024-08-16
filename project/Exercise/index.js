const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI);

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/api/users/delete', async function (_req, res) {
	try {
		const result = await User.deleteMany({});
		res.json({ message: 'All users have been deleted!', result: result });
	} catch (err) {
		console.error(err);
		res.json({ message: 'Deleting all users failed!' });
	}
});

app.get('/api/exercises/delete', async function (_req, res) {
	try {
		const result = await Exercise.deleteMany({});
		res.json({ message: 'All exercises have been deleted!', result: result });
	} catch (err) {
		console.error(err);
		res.json({ message: 'Deleting all exercises failed!' });
	}
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

app.get('/api/users', async function (_req, res) {
	try {
		const users = await User.find({});
		if (users.length === 0) {
			res.json({ message: 'There are no users in the database!' });
		} else {
			res.json(users);
		}
	} catch (err) {
		console.error(err);
		res.json({ message: 'Getting all users failed!' });
	}
});

app.post('/api/users', async function (req, res) {
	const inputUsername = req.body.username;
	let newUser = new User({ username: inputUsername });
	try {
		let user = await newUser.save();
		res.json({ username: user.username, _id: user._id });
	} catch (err) {
		console.error(err);
		res.json({ message: 'User creation failed!' });
	}
});

app.post('/api/users/:_id/exercises', async function (req, res) {
	const userId = req.params._id;
	const description = req.body.description;
	const duration = req.body.duration;
	let date = req.body.date;

	if (!date) {
		date = new Date().toISOString().substring(0, 10);
	}

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.json({ message: 'Invalid user ID format!' });
	}

	try {
		const userInDb = await User.findById(userId).exec();
		if (!userInDb) {
			return res.json({ message: 'There are no users with that ID in the database!' });
		}

		let newExercise = new Exercise({
			userId: userInDb._id,
			username: userInDb.username,
			description: description,
			duration: parseInt(duration),
			date: date,
		});

		let exercise = await newExercise.save();
		res.json({
			username: userInDb.username,
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
			_id: userInDb._id,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Exercise creation failed!' });
	}
});

app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.json({ message: 'Invalid user ID format!' });
	}

	try {
		const user = await User.findById(userId).exec();
		if (!user) {
			return res.json({ message: 'There are no users with that ID in the database!' });
		}

		const exercises = await Exercise.find({
			userId: userId,
			date: { $gte: from, $lte: to },
		})
			.select('description duration date')
			.limit(limit)
			.exec();

		const parsedDatesLog = exercises.map((exercise) => ({
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		}));

		res.json({
			_id: user._id,
			username: user.username,
			count: parsedDatesLog.length,
			log: parsedDatesLog,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Getting user logs failed!' });
	}
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
