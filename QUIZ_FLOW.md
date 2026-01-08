# End User Quiz Flow

## Overview
This module implements a complete end-user experience for taking cybersecurity awareness quizzes.

## Features

### 1. Quiz System
- **Dynamic Question Loading**: Fetches quiz questions from the database
- **Multiple Choice Questions**: Supports A/B/C/D format answers
- **Real-time Validation**: Ensures all questions are answered before submission
- **Automatic Scoring**: Calculates scores based on correct answers

### 2. User Interface
- **Modern Design**: Clean, professional UI with gradient backgrounds
- **Responsive Layout**: Works on desktop and mobile devices
- **Progress Tracking**: Shows answered vs. unanswered questions
- **Interactive Feedback**: Hover effects and clear visual states

### 3. Results & Review
- **Instant Results**: Shows score percentage immediately after submission
- **Detailed Review**: Displays correct/incorrect answers with explanations
- **Pass/Fail Feedback**: Visual indicators for performance (70% passing threshold)
- **Answer Comparison**: Shows user's answer vs. correct answer

## User Flow

1. **Landing Page** (`/demo`)
   - Employee sees overview of the training
   - Clicks "Start Quiz" button
   - System generates unique quiz token

2. **Quiz Page** (`/quiz/[token]`)
   - Questions load automatically
   - Employee selects answers (A/B/C/D)
   - Submit button activates when all questions answered

3. **Results Page** (same page after submission)
   - Shows final score and percentage
   - Lists all questions with review
   - Indicates correct/incorrect answers
   - Displays correct answer for missed questions

## API Endpoints

### GET `/quiz/:token`
Fetches quiz questions for a specific token.

**Response:**
```json
{
  "quiz": {
    "id": "uuid",
    "title": "Cybersecurity Awareness Quiz",
    "questions": [
      {
        "id": "uuid",
        "question_text": "What is phishing?",
        "options": ["Option A", "Option B", "Option C", "Option D"]
      }
    ],
    "token": "abc123..."
  }
}
```

### POST `/quiz/:token/submit`
Submits quiz answers and returns score.

**Request:**
```json
{
  "answers": [
    { "questionId": "uuid", "answer": "B" },
    { "questionId": "uuid", "answer": "C" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "score": 100,
  "correct": 3,
  "total": 3,
  "results": [
    {
      "questionId": "uuid",
      "isCorrect": true,
      "correctAnswer": "B"
    }
  ]
}
```

### POST `/generate-quiz-token`
Generates a unique token for accessing a quiz.

**Request:**
```json
{
  "employee_email": "john@company.com" // optional
}
```

**Response:**
```json
{
  "token": "abc123...",
  "quiz_url": "http://localhost:3000/quiz/abc123..."
}
```

## Testing the Flow

1. **Start the backend:**
   ```bash
   npm start
   # or
   node server.js
   ```

2. **Start the frontend:**
   ```bash
   cd web
   npm run dev
   ```

3. **Access the demo page:**
   ```
   http://localhost:3000/demo
   ```

4. **Or generate a token via API:**
   ```bash
   curl -X POST http://localhost:4000/generate-quiz-token \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

## Database Schema

The quiz system uses these tables:
- `quizzes` - Quiz metadata (title, created_at)
- `quiz_questions` - Individual questions with options and correct answers
- `quiz_attempts` - Records of completed quizzes with scores
- `phishing_events` - Tracks quiz completion events

## Default Quiz Questions

If no quiz exists in the database, the system uses these default questions:

1. **What is phishing?**
   - A) A type of fishing
   - B) A fraudulent attempt to obtain sensitive information ✓
   - C) A computer virus
   - D) A firewall

2. **What should you do if you receive a suspicious email?**
   - A) Click all links to investigate
   - B) Report it to IT/Security ✓
   - C) Reply to sender
   - D) Forward to colleagues

3. **What makes a strong password?**
   - A) Your birthday
   - B) The word "password"
   - C) At least 12 characters with mixed types ✓
   - D) Your name

## Future Enhancements

- [ ] Track individual employee progress
- [ ] Send quiz links via email campaigns
- [ ] Add time limits for quizzes
- [ ] Support for different question types (true/false, multiple select)
- [ ] Quiz result analytics and reporting
- [ ] Retake functionality with different questions
- [ ] Certificate generation upon passing
