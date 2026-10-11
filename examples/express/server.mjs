// Accept a comment only if Proof of Type proves a human typed it.
// npm i express proofoftype-input
import express from 'express';
import { verifyProof } from 'proofoftype-input/server';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));            // serves examples/html-form/index.html

const ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:3000';

app.post('/comments', async (req, res) => {
  const { comment, comment_proof } = req.body;
  const r = await verifyProof({ token: comment_proof, text: comment, origin: ORIGIN });
  if (!r.ok) return res.status(400).send(`Not verified (${r.reason}). Please type your comment in the box.`);
  // Save comment + comment_proof. r.proof.author is the Proof of Type username.
  res.send(`Thanks @${r.proof.author}: verified as typed by a human.`);
});

app.listen(3000, () => console.log(`http://localhost:3000`));
