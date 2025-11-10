const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// assignment10
// 5pBnPkwHmyoH7kQD
const uri =
  "mongodb+srv://assignment10:5pBnPkwHmyoH7kQD@cluster0.avcddas.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hii World");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("community_cleaning_db");
    const issuesCollection = db.collection("issuesCollection");
    const categoryCollection = db.collection("categoryCollections");

    app.get("/issues", async (req, res) => {
      const issues = issuesCollection.find().sort({ date: -1 }).limit(4);
      const result = await issues.toArray();
      res.send(result);
    });

    app.get("/garbage", async (req, res) => {
      const query = { category: "Garbage" };
      const result = await categoryCollection.findOne(query);
      res.send(result);
    });

    app.get("/illegalConstruction", async (req, res) => {
      const query = { category: "Illegal Construction" };
      const result = await categoryCollection.findOne(query);
      res.send(result);
    });

    app.get("/brokenPublicProperty", async (req, res) => {
      const query = { category: "Broken Public Property" };
      const result = await categoryCollection.findOne(query);
      res.send(result);
    });

    app.get("/roadDamage", async (req, res) => {
      const query = { category: "Road Damage" };
      const result = await categoryCollection.findOne(query);
      res.send(result);
    });

    app.post("/issues", async (req, res) => {
      const newIssue = req.body;
      const result = await issuesCollection.insertOne(newIssue);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // client.close()
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("App is running on port", port);
});
