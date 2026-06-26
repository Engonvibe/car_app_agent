import { Router, Request, Response } from "express";

/* ---------------------------------------------------------------------------
   Internal validation / evaluation data (Phase 9).

   This is for project evaluation only and is served behind authentication.
   The numbers here are clearly-labelled SAMPLE / DEMO values used to show how
   the project would be evaluated — they are not from a real study, except the
   NLP/voice metrics which the frontend computes live from the actual parser.

   Feasibility statuses are honest: items that are not finished are marked
   "Prototype" or "Pending", never "Done".
--------------------------------------------------------------------------- */

export const validationRouter = Router();

validationRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    sample: true,
    generatedNote:
      "Sample/demo evaluation data for project assessment. Replace with real measurements when available.",

    recommendationEval: {
      sample: true,
      k: 3,
      precisionAtK: 0.78,
      recallAtK: 0.71,
      ndcg: 0.83,
      explanation:
        "Measures whether the recommended services are useful and shown in a sensible order (top-K). Sample values only.",
    },

    reminderEval: {
      sample: true,
      maeDays: 9.4,
      accuracy: 0.86,
      timeDeviationDays: 11.2,
      explanation:
        "Measures whether reminders appear at the right time. MAE/time deviation are in days. Rule-based and explainable. Sample values only.",
    },

    feasibility: [
      { label: "API integration working", status: "Done" },
      { label: "Database persistence working", status: "Done" },
      { label: "Authentication working", status: "Done" },
      { label: "Role-based access working", status: "Done" },
      { label: "Voice input prototype working", status: "Prototype" },
      { label: "Prediction engine prototype working", status: "Prototype" },
      { label: "Agent / workflow integration", status: "Pending" },
      { label: "Load testing", status: "Pending" },
      { label: "GDPR checklist", status: "Pending" },
      { label: "Federated learning prototype", status: "Pending" },
    ],

    userEval: {
      status: "Pending / To be completed",
      items: [
        { label: "50+ user tests", value: "Pending / To be completed" },
        { label: "SUS score", value: "Pending / To be completed" },
        { label: "Task completion time", value: "Pending / To be completed" },
        { label: "Click count", value: "Pending / To be completed" },
        { label: "Error rate", value: "Pending / To be completed" },
        { label: "Satisfaction score", value: "Pending / To be completed" },
      ],
    },
  });
});
