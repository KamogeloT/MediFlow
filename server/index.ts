import express from "express";
import patientHistory from "./patient-history";

const app = express();

app.use(express.json());
app.use("/api/patient-history", patientHistory);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
