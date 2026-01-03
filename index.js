const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
const stripe = require("stripe")(process.env.STRIPE_USER);

var admin = require("firebase-admin");

var serviceAccount = require("./AdminSDK/assignment-10communitycleaning-firebase-adminsdk-fbsvc-6d5ce80479.json");
const e = require("express");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const verifyFBToken = async (req, res, next) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.decoded_email = decoded.email;
    next();
  } catch (err) {}
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.avcddas.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const db = client.db("community_cleaning_db");
    const issuesCollection = db.collection("issuesCollection");
    const categoryCollection = db.collection("categoryCollections");
    const addIssue = db.collection("addIssueCollection");
    const contribution = db.collection("contribution");
    const usersCollection = db.collection("usersCollection");

    app.get("/", (req, res) => {
      res.send("Hello");
    });

    // Users Related APIs
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      console.log(result.role);
      res.send(result.role);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.createdAt = new Date().toLocaleString();
      const email = user.email;
      const alreadyExists = await usersCollection.findOne({ email });
      if (alreadyExists) {
        return res.send({ message: "User Already Exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/issues", async (req, res) => {
      const issues = issuesCollection.find().sort({ date: -1 }).limit(6);
      const result = await issues.toArray();
      res.send(result);
    });

    app.post("/addIssues", async (req, res) => {
      const newIssue = req.body;
      const result = await addIssue.insertOne(newIssue);
      res.send(result);
    });

    app.patch("/addIssues/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          title: updatedData.title,
          status: updatedData.status,
          amount: updatedData.amount,
          category: updatedData.category,
        },
      };
      const result = await addIssue.updateOne(query, update);
      res.send(result);
    });

    app.delete("/addIssues/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addIssue.deleteOne(query);
      res.send(result);
    });

    app.get("/myIssues", verifyFBToken, async (req, res) => {
      const email = req.query.email;

      const query = {};
      if (email) {
        query.email = email;

        // check email for JWT verification
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
      }
      const issues = addIssue.find(query);
      const result = await issues.toArray();
      res.send(result);
    });

    app.get("/allIssues", async (req, res) => {
      const limitNum = Number(req.query.limit) || 6;
      const skipNum = Number(req.query.skip) || 0;
      const cursor = issuesCollection
        .find()
        .skip(Number(skipNum))
        .limit(Number(limitNum));
      const result = await cursor.toArray();
      const count = await issuesCollection.countDocuments();
      res.send({ data: result, hasMore: skipNum + result.length < count });
    });

    app.get("/allIssues/issue/:id", async (req, res) => {
      const id = req.params.id;
      const query = { issueId: id };
      const cursor = contribution.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allIssues/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issuesCollection.findOne(query);
      res.send(result);
    });

    app.get("/categoryCards", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/myContribution", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (query) {
        query.email = email;
      }
      const contributions = contribution.find(query);
      const result = await contributions.toArray();
      res.send(result);
    });

    // Payment Related APIs
    app.post("/create-checkout-session", async (req, res) => {
      const contribution = req.body;
      const amount = parseInt(contribution.amount) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "USD",
              unit_amount: amount,
              product_data: {
                name: contribution.issueTitle,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: contribution.email,
        metadata: {
          issueId: contribution.issue_id,
          title: contribution.title,
          issueTitle: contribution.issueTitle,
          amount: contribution.amount,
          name: contribution.name,
          email: contribution.email,
          image: contribution.image,
          phoneNumber: contribution.phoneNumber,
          address: contribution.address,
          info: contribution.info,
          createdAt: new Date().toLocaleString(),
        },
        mode: "payment",
        success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });
      res.send({ url: session.url });
    });

    app.post("/payment-success", async (req, res) => {
      try {
        const sessionId = req.query.session_id;
        if (!sessionId)
          return res.status(400).send({ message: "No session_id provided" });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const transactionId = session.payment_intent;

        if (!transactionId)
          return res.status(400).send({ message: "No transaction found" });

        if (session.payment_status !== "paid") {
          return res.send({ message: "Payment not completed" });
        }

        const contributionData = {
          issueId: session.metadata.issueId,
          title: session.metadata.title,
          issueTitle: session.metadata.issueTitle,
          amount: session.metadata.amount,
          name: session.metadata.name,
          email: session.metadata.email,
          image: session.metadata.image,
          phoneNumber: session.metadata.phoneNumber,
          address: session.metadata.address,
          info: session.metadata.info,
          createdAt: new Date(),
          transactionId: transactionId,
        };

        const result = await contribution.updateOne(
          { transactionId: transactionId },
          { $setOnInsert: contributionData },
          { upsert: true }
        );

        if (result.upsertedCount === 1) {
          return res.send({
            message: "Payment saved successfully",
            transactionId,
          });
        } else {
          return res.send({ message: "Payment already exists", transactionId });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error", error });
      }
    });

    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // client.close()
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("App is running on port", port);
});
