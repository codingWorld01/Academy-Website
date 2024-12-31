const temp = require('dotenv').config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const hbs = require("hbs");
const Register = require("./models/register");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken"); // Make sure you're using jsonwebtoken
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("./db/conn");

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../templates/views"));
hbs.registerPartials(path.join(__dirname, "../templates/partials"));

app.get("/", (req, res) => {
    const token = req.cookies.jwt;
    let loggedIn = false;

    // Check if token exists and is valid
    if (token) {
        try {
            const verified = jwt.verify(token, process.env.SECRET_KEY);  // Check if token is valid
            loggedIn = true;
        } catch (err) {
            loggedIn = false;
        }
    }

    // Pass the loggedIn status to the template
    res.render("index", { loggedIn });
});

app.get("/aboutus", auth, (req, res) => {
    console.log(`about Us:${req.cookies.jwt}`);
    res.render("aboutus", { loggedIn: true });
});

app.get("/login", (req, res) => {
    res.render("login", { loggedIn: false });
});

// Logout
app.get("/logout", auth, async (req, res) => {
    try {
        // Logout from all Devices
        req.user.tokens = [];

        res.clearCookie("jwt");
        console.log("Logout Successfully");

        await req.user.save();
        res.render("login", { loggedIn: false });
    } catch (err) {
        res.status(400).send(err);
        console.log(err);
    }
});

app.get("/register", (req, res) => {
    res.render("register", { loggedIn: false });
});

// Registration check
app.post("/register", async (req, res) => {
    try {
        const password = req.body.password;
        const cpassword = req.body.confirmpassword;

        if (password === cpassword) {
            const registerEmp = new Register({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                age: req.body.age,
                email: req.body.email,
                gender: req.body.gender,
                password: req.body.password,
                phone: req.body.phone
            });

            // Generate token
            const token = await registerEmp.generateAuthToken();
            res.cookie("jwt", token, {
                httpOnly: true
            });

            await registerEmp.save();
            res.status(201).render("index", { loggedIn: true });
        } else {
            res.send("Passwords do not match");
        }
    } catch (err) {
        res.status(400).send(err);
        console.log(err);
    }
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password");
});

// Login validation
app.post("/login", async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const user = await Register.findOne({ email: email });
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = await user.generateAuthToken();
            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 1000000),
                httpOnly: true
            });

            res.render("index", { loggedIn: true });
        } else {
            res.send("Invalid Password");
        }
    } catch (err) {
        res.status(400).send("Invalid Email");
        console.log(err);
    }
});

app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await Register.findOne({ email });

        if (!user) {
            return res.status(400).send("User with this email does not exist.");
        }

        // Generate a token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Set token expiry time (e.g., 1 hour)
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000;

        console.log("before ", user.resetToken, user.resetTokenExpiry);
        await user.save();

        // Send email
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: "Password Reset",
            html: `<h2>Password Reset</h2><p>Click the link below to reset your password:</p><a href="http://${req.headers.host}/reset-password/${resetToken}">Reset Password</a>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log("Email sent: " + info.response);
        });

        res.send("Password reset link has been sent to your email.");

    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});


app.get("/reset-password/:token", async (req, res) => {
    const token = req.params.token;

    try {
        const user = await Register.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() },
        });

        console.log("Token received from URL:", user);
        if (!user) {
            return res.status(400).send("Invalid or expired token.");
        }

        res.render("reset-password", { token });
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});


app.post("/reset-password/:token", async (req, res) => {
    const { password, confirmPassword } = req.body;
    const token = req.params.token;

    try {
        const user = await Register.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).send("Invalid or expired token.");
        }

        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match.");
        }

        // Hash the new password
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        console.log(user.password);
        
        await user.save();

        res.render('login');
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

