const mongoose = require("mongoose")

mongoose.connect("mongodb://127.0.0.1:27017/Managers", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connection Established");
}).catch((e) => {
    console.log("Connection Failed" + e);
})
