const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    await client.connect();
    const db = client.db("community_cleaning_db");
    const issuesCollection = db.collection("issuesCollection");
    const categoryCollection = db.collection("categoryCollections");
    const addIssue = db.collection("addIssueCollection");
    const contribution = db.collection("contribution");

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

    app.get("/myIssues", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const issues = addIssue.find(query);
      const result = await issues.toArray();
      res.send(result);
    });

    app.get("/allIssues", async (req, res) => {
      // console.log(req.query);
      // const email = req.query.email;
      // const query = {};
      // if (email) {
      //   query.email = email;
      // }

      const issues = issuesCollection.find();
      const result = await issues.toArray();
      res.send(result);
    });

    app.get("/allIssues/issue/:id", async (req, res) => {
      const id = req.params.id;
      const query = { product_id: id };
      const cursor = contribution.find(query);
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

    app.post("/contribution", async (req, res) => {
      const newContribution = req.body;
      const result = await contribution.insertOne(newContribution);
      res.send(result);
    });

    app.get("/myContribution", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (query) {
        query.email = email;
      }
      const contributions = contribution.find(query)
      const result = await contributions.toArray();
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
