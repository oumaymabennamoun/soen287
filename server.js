const express = require("express");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const PORT = 7000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: "your_secret_key", 
    resave: false,
    saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
    ejs.renderFile(path.join(__dirname, "views", "partials", "header.ejs"), (err, header) => {
        if (err) return res.status(500).send("Error loading header");

        ejs.renderFile(path.join(__dirname, "views", "partials", "footer.ejs"), (err, footer) => {
            if (err) return res.status(500).send("Error loading footer");
            res.locals.header = header;
            res.locals.footer = footer;
            next();
        });
    });
});

app.get("/", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "index.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading homepage");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/privacy", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "privacy.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading privacy/disclaimer statement");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/attribution", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "attribution.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading attribution page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/pets", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "pets.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading pets page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/dogcare", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "dogcare.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading dog care page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/catcare", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "catcare.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading cat care page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/createaccount", (req, res) => {
    if (req.session.user) {
        return res.redirect("/");
    }

    fs.readFile(path.join(__dirname, "views", "createaccount.html"), "utf8", (err, content) => {
        if (err) {
            return res.status(500).send("Error loading create account page");
        }
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/giveaway", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "giveaway.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading giveaway page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.get("/check-session", (req, res) => {
    res.json({ loggedIn: !!req.session.user });
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out.");
        }
        res.redirect("/?message=You have been logged out.");
    });
});

app.get("/contact", (req, res) => {
    fs.readFile(path.join(__dirname, "views", "contact.html"), "utf8", (err, content) => {
        if (err) return res.status(500).send("Error loading contact page");
        res.send(res.locals.header + content + res.locals.footer);
    });
});

app.post("/pets", (req, res) => {
    const { petType, breed, age, gender } = req.body;
    const pets = readPetsFile();

    const filteredPets = pets.filter(pet => {
        const [ , pType, pBreed, pAge, pGender ] = pet.split(":");
        return (!petType || pType.includes(petType)) &&
               (!breed || pBreed.includes(breed)) &&
               (!age || pAge.includes(age)) &&
               (!gender || pGender.includes(gender));
    });

    fs.readFile(path.join(__dirname, "views", "pets.html"), "utf-8", (err, data) => {
        if (err) {
            return res.status(500).send("Error reading pets page");
        }

        const results = filteredPets.map(pet => `<li>${pet}</li>`).join("");
        const resultsPage = data.replace("<!--RESULTS_PLACEHOLDER-->", results);

        res.send(res.locals.header + resultsPage + res.locals.footer);
    });
});

const readPetsFile = () => {
    return fs.readFileSync("pets.txt", "utf-8").split("\n").filter(Boolean);
};

app.post("/createaccount", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.redirect("/createaccount?message=Username and password are required.");
    }

    const usernamePattern = /^[a-zA-Z0-9]+$/;
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{4,}$/;

    if (!usernamePattern.test(username)) {
        return res.redirect("/createaccount?message=Letters (upper and lower case) and digits only.");
    }

    if (!passwordPattern.test(password)) {
        return res.redirect("/createaccount?message=Letters and digits only. At least 4 characters (including at least one letter and one digit).");
    }

    fs.readFile(path.join(__dirname, "data", "login.txt"), "utf8", (err, data) => {
        if (err && err.code !== "ENOENT") {
            return res.redirect("/createaccount?message=Error reading login file.");
        }

        const users = (data || "").split("\n").map(line => line.split(":")[0]);
        if (users.includes(username)) {
            return res.redirect("/createaccount?message=Username is taken. Please enter a different username.");
        }

        fs.appendFile(path.join(__dirname, "data", "login.txt"), `${username}:${password}\n`, (err) => {
            if (err) {
                return res.redirect("/createaccount?message=Error writing to login file.");
            }
            res.redirect("/createaccount?message=Account created successfully! You may now log in.");
        });
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    console.log("Login Request Body:", req.body); 

    if (!username || !password) {
        return res.json({ success: false, message: "Username and password are required." });
    }

    fs.readFile(path.join(__dirname, "data", "login.txt"), "utf8", (err, data) => {
        if (err) return res.status(500).send("Error reading login file.");

        const users = data.split("\n").map(line => line.split(":"));
        const user = users.find(([user, pass]) => user.trim() === username.trim() && pass.trim() === password.trim());

        if (user) {
            req.session.user = username;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Invalid username or password." });
        }
    });
});

app.post("/giveaway", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/giveaway?message=" + encodeURIComponent("You must be logged in to submit a pet."));
    }

    const { type, breed, age, gender } = req.body;
    if (!type || !breed || !age || !gender) {
        return res.redirect("/giveaway?message=" + encodeURIComponent("All fields are required."));
    }

    fs.readFile(path.join(__dirname, "data", "pets.txt"), "utf8", (err, data) => {
        if (err && err.code !== "ENOENT") return res.redirect("/giveaway?message=" + encodeURIComponent("Error reading pets file."));

        let lines = data ? data.trim().split("\n") : [];
        let maxId = 0;

        if (lines.length > 0) {
            lines.forEach(line => {
                const parts = line.split(":");
                const id = parseInt(parts[0], 10);
                if (!isNaN(id)) {
                    maxId = Math.max(maxId, id);
                }
            });
        }

        const newId = maxId + 1;
        const newPet = `${newId}:${req.session.user}:${type}:${breed}:${age}:${gender}`;

        fs.appendFile(path.join(__dirname, "data", "pets.txt"), newPet + "\n", (err) => {
            if (err) return res.redirect("/giveaway?message=" + encodeURIComponent("Error writing to pets file."));
            res.redirect("/giveaway?message=" + encodeURIComponent("Pet submitted successfully!"));
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});