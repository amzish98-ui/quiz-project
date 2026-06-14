# QuizMaster Pro

An interactive online quiz application built with HTML, CSS, and JavaScript as part of Project 3.

## What it does

QuizMaster Pro fetches live trivia questions from the [Open Trivia Database API](https://opentdb.com) so every quiz is unique — no hard-coded question lists. Before starting, players enter their **name**, then pick a **category** (General Knowledge, Science, History, Geography, Sports, Entertainment, Computers or Mathematics) and a **difficulty** (Any, Easy, Medium, Hard). Players then race against a 20-second timer, earn bonus points for fast answers, and see their results on a local leaderboard.

## Value to users

- A quick, fresh trivia challenge every time — questions are pulled live so they never get repetitive.
- Players can tailor each session to their interests and skill level via the category/difficulty pickers.
- The leaderboard and live session stats add a competitive, game-like incentive to keep playing and improve.
- The end-of-quiz review gives instant, useful feedback on every question, including the correct answer.

## Features

- **Live questions** — powered by the Open Trivia DB API (no repeated questions)
- **Setup screen** — enter your name, choose a category and difficulty before each quiz
- **Eight categories** — General Knowledge, Science, History, Geography, Sports, Entertainment, Computers, Mathematics
- **Three question types** — Multiple Choice, True/False, and Fill-in-the-Blank
- **20-second timer** — with animated SVG ring; turns amber at 10s, red at 5s
- **Instant feedback** — correct/wrong animation on every answer
- **Speed scoring** — faster answers earn more points (up to 200 pts per question)
- **Streak tracking** — consecutive correct answers tracked per session
- **Local leaderboard** — top 10 scores saved in localStorage
- **Dark / Light mode** — toggle saved between sessions
- **Desktop two-column layout** — question on the left, leaderboard on the right
- **Fully responsive** — adapts across desktop, tablet (iPad) and phone screen sizes
- **Answer review** — full breakdown with correct answers shown at the end
- **How-To page** — instructions, name entry, category and difficulty selection

## Technologies Used

- HTML5
- CSS3 (custom properties, CSS Grid, Flexbox, media queries, keyframe animations)
- Vanilla JavaScript (ES6+, Fetch API, localStorage)
- [Open Trivia Database API](https://opentdb.com) — external source for questions
- [Google Fonts](https://fonts.google.com) — Syne (display) + DM Sans (body)

## File Structure

```
quiz-project/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        └── quiz.js
```

## How to Run Locally

1. Download or clone this repository
2. Open `index.html` in any modern browser
3. No build step or server required — it runs entirely in the browser

## Deployment (GitHub Pages)

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Under **Source**, select `main` branch and `/ (root)` folder
4. Click **Save** — your live URL will appear within a minute

## Responsive Design

The layout was tested at three breakpoints to ensure it works well on:

- **Desktop** (1024px+) — two-column quiz layout with the leaderboard alongside the question
- **Tablet / iPad** (641px–1024px) — single-column quiz layout, sidebar moves below the question
- **Phone** (≤640px) — stacked answer buttons, single-column setup form, compact header

## Testing & Code Validation

Validate the code using these tools, then document any errors/warnings found and how they were fixed:

- HTML: [W3C Validator](https://validator.w3.org/#validate_by_input)
- CSS: [Jigsaw Validator](http://jigsaw.w3.org/css-validator/)
- JavaScript: [JSHint](https://jshint.com)

### Manual testing checklist

- [ ] Name field validation — Start Quiz is blocked until a name is entered
- [ ] Each category/difficulty combination loads questions correctly
- [ ] Timer counts down and auto-submits as wrong when it reaches 0
- [ ] Multiple choice, True/False and Fill-in-the-Blank questions all render and score correctly
- [ ] Score, correct count and streak update live in the sidebar
- [ ] Leaderboard saves and persists top 10 scores after a page refresh
- [ ] Dark/Light theme toggle works and persists after a page refresh
- [ ] Layout checked on desktop, tablet (iPad) and phone screen sizes
- [ ] No broken links or console errors

## External Sources & Attribution

| Source | Usage | URL |
|--------|-------|-----|
| Open Trivia DB API | Live quiz questions | https://opentdb.com |
| Google Fonts | Syne + DM Sans typefaces | https://fonts.google.com |

All other HTML, CSS, and JavaScript was written from scratch for this project.

## Screenshots

*(Add screenshots here after deployment — one of the How-To page, one of the Quiz page, one of the Results page, with a short description of each feature and its value to the user)*

## Author

Amir Shahsavari — Project 3, Learning People
