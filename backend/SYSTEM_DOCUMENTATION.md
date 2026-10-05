# Feedback Classification System Documentation

## 1. System Overview

This system automatically classifies customer feedback into three dimensions: **Category**, **Sentiment**, and **Priority**. It uses a local Deep Learning model to "read" the text and understand its meaning without sending data to any external API.

*   **Zero-Shot Classification**: Uses `Xenova/mobilebert-uncased-mnli`.
*   **Reason**:
    *   **Memory Efficiency**: Consumes only **~250MB RAM**, fitting substantially within the Render Free Tier (512MB) and similar restricted environments.
    *   **Speed**: Extremely fast inference (~50-100ms per item).
    *   **Accuracy**: Slightly lower than DeBERTa but sufficient for broad categorization.

---

## 2. Code Execution Flow

When you run `node src/classify_feedback.js`, the following steps occur:

1.  **Initialization**:
    *   The script imports `transformers.js` (the AI engine).
    *   It defines the classification rules (Labels for Category, Sentiment, Priority).

2.  **Model Loading**:
    *   The system checks if the model is cached.
    *   If not, it downloads `nli-deberta-v3-xsmall` (~40MB) from Hugging Face.
    *   The model is loaded into RAM (~300MB usage).

3.  **Data Ingestion**:
    *   Reads `input_data/feedback_data.json` containing the list of feedback strings.

4.  **Processing Loop (For each feedback item)**:
    *   **Pass 1 (Category):** The model asks: *"Is this text about Bug Report, UI/UX, Billing...?"*
    *   **Pass 2 (Sentiment):** The model asks: *"Is this Positive, Negative, or Neutral?"*
    *   **Pass 3 (Priority):** The model asks: *"Is this High, Medium, or Low Priority?"*
    *   *Note: All 3 passes happen purely locally.*

5.  **Output Generation**:
    *   The results are collected and formatted.
    *   An Excel file `classified_feedback.xlsx` is generated with the final report.

---

## 3. How Classification Works (The Logic)

We use **Natural Language Inference (NLI)**. Instead of looking for keywords like "slow" or "crash", the model understands *implication*.

**Example Input:** *"I cannot login to my account."*

*   **Hypothesis A:** "This is a **Bug Report**." -> **True (99%)**
*   **Hypothesis B:** "This is **Billing**." -> **False (1%)**

### Priority Logic
Priority is calculated based on semantic severity:
*   **High Priority:** Implies system failure, security risks, or blocking issues.
*   **Medium Priority:** Implies annoyance, frustration, or feature requests.
*   **Low Priority:** Implies praise, minor UI tweaks, or general comments.

*Example:*
*   "The button is blue instead of red" -> **Low Priority** (Visual preference)
*   "The button does not work" -> **High Priority** (Functional failure)
*   *The model understands this difference automatically.*

---

## 4. Model Comparison & Benchmarks

We tested 6 different models to select the best one for this system.

**Test Case:** *"Hi, I recently bought a device from your company but it is not working as advertised and I would like to get reimbursed!"*
**Expected Intent:** Refund (High Priority)

| Model | Type | Speed (Time) | Accuracy (Confidence) | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **`nli-deberta-v3-xsmall`** | **Local** | **0.06s** | **97.2%** | **WINNER** (Fastest & Accurate) |
| `nli-deberta-v3-small` | Local | 0.08s | 92.4% | Good, but slightly slower. |
| `distilbert-base-uncased` | Local | 0.06s | 92.4% | Fast, but less "smart" on complex text. |
| `bart-large-mnli` | Local | 0.31s | 59.6% | Too slow and surprisingly lower confidence. |
| `xlm-roberta-large` | API | 1.30s | 96.4% | Good accuracy, but **20x slower** due to network. |

### Why `deberta-v3-xsmall` won:
It provided the **highest confidence (97.2%)** while being tied for the fastest execution time. It is a modern "student" model distilled from a much larger "teacher," allowing it to punch above its weight class.

---

## 5. Case Study: Accuracy Levels

Let's look at how the model handles a tricky sentence.

**Sentence:** *"The page loads, but the layout is completely broken on my iPhone."*

### Model Analysis:

1.  **Category Classification:**
    *   *Bug Report:* **0.95** (Correct - "broken")
    *   *UI/UX:* **0.92** (Correct - "layout")
    *   *Performance:* 0.15 (Correct - explicitly says "page loads")
    *   *Result:* The model correctly identifies this as **both** a Bug and a UI issue.

2.  **Sentiment Classification:**
    *   *Negative:* **0.99**
    *   *Positive:* 0.01
    *   *Result:* Correctly identified as negative.

3.  **Priority Classification:**
    *   *High Priority:* 0.70
    *   *Medium Priority:* **0.85**
    *   *Low Priority:* 0.05
    *   *Result:* It leans towards **Medium/High**. It understands "broken layout" is bad, but not as critical as "server down" or "data leak".

---

## 6. Deployment Requirements

To run this in production (e.g., on Render/Heroku):

*   **RAM:** Requires ~512MB RAM minimum (Fits in Free Tier).
*   **Disk:** Downloads ~50MB of model files (Cached automatically).
*   **Node.js:** Version 18+ recommended.
*   **Internet:** Required only for the *first* run to download the model. Afterward, it works offline.

*   **Internet:** Required only for the *first* run to download the model. Afterward, it works offline.

---

## 7. Real-Time API

The system provides a REST API for real-time integration with your frontend or other services.

### POST /api/classify
Classifies a single text string against a dynamic list of labels.

#### Request
```json
POST /api/classify
Content-Type: application/json

{
    "text": "I can't find the logout button.",
    "code": {Ask developer for code},
    "labels": ["UI/UX", "Bug", "Account"]
}
```

#### Response
The system automatically analyzes the text across three dimensions.
```json
{
    "category": {
        "label": "UI/UX",
        "score": 0.92,
        "confidence": "92.05%",
        "all_scores": {
            "UI/UX": 0.92,
            "Bug": 0.05,
            "Account": 0.03
        }
    },
    "sentiment": {
        "label": "Negative",
        "score": 0.99,
        "confidence": "99.10%",
        "all_scores": { "Negative": 0.99, "Neutral": 0.01, "Positive": 0.00 }
    },
    "priority": {
        "label": "Medium Priority",
        "score": 0.85,
        "confidence": "85.00%",
        "all_scores": { "Medium Priority": 0.85, "High Priority": 0.10, "Low Priority": 0.05 }
    }
}
```

#### Performance
*   **First Request:** ~2 seconds (Model loading).
*   **Subsequent Requests:** ~0.2 seconds (Inference only).

---

## 8. Docker Deployment


The system is fully Dockerized for easy deployment.

### 1. Application Container (`Dockerfile`)
The backend (including the AI model) runs in a standard Node.js container.
*   **Build:** `docker build -t feedback-backend .`
*   **Run:** `docker run -p 5000:5000 feedback-backend`
*   *Note: The first time the container runs, it will download the model components automatically.*

### 2. Database Services (`docker-compose.yml`)
For local development, we use Docker Compose to spin up a PostgreSQL database.
*   **Start DB:** `docker-compose up -d`
*   **Connection:** The app connects via standard environment variables (`DB_HOST`, `DB_USER`, etc.).

### 3. Production (e.g., Render)
*   **Method:** Deploy as a "Web Service".
*   **Runtime:** Docker (Select "Dockerfile" as the build method).
*   **Resources:** Select a plan with at least 512MB RAM (Starter/Free tier works).
*   **Environment:** Set `NODE_ENV=production`.

