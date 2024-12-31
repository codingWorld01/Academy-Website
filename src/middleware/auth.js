const jwt = require("jsonwebtoken")
const Register = require("../models/register")

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY)
        // console.log(`Auth:${verifyUser._id}`);

        const user = await Register.findOne({_id:verifyUser._id})
        // console.log(`User : ${user.tokens}`);

        req.token = token;
        req.user = user;
        next()
    } catch (err) {
       res.status(401).send(err)
    }
}

module.exports = auth

