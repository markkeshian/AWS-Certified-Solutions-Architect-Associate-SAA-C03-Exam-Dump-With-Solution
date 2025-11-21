// AWS SAA-C03 Quiz Application
class Quiz {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.currentPage = 1;
        this.questionsPerPage = 10;
        this.score = 0;
        this.userAnswers = [];
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.renderQuestion();
        this.setupEventListeners();
    }

    async loadQuestions() {
        try {
            const response = await fetch('AWS SAA-03 Solution.txt');
            const text = await response.text();
            this.parseQuestions(text);
        } catch (error) {
            console.error('Error loading questions:', error);
            document.getElementById('quizContainer').innerHTML = 
                '<div class="loading">Error loading questions. Please refresh the page.</div>';
        }
    }

    parseQuestions(text) {
        // First, normalize the text by fixing line breaks
        text = text.replace(/\r\n/g, '\n');
        
        // Split by question patterns - match various formats
        // Match: "1]", "1)", "1.", "1 " at start of line followed by content
        const questionRegex = /(?:^|\n)(\d+)[\]\)\.]\s*(.+?)(?=\n\d+[\]\)\.]\s*|\n*$)/gs;
        
        const matches = Array.from(text.matchAll(questionRegex));
        
        console.log(`🔍 Found ${matches.length} potential question blocks`);
        
        matches.forEach(match => {
            const fullBlock = match[0];
            const questionNumber = parseInt(match[1]);
            
            // Skip empty or very short blocks (empty question placeholders)
            if (!fullBlock || fullBlock.trim().length < 30) {
                console.log(`⚠️ Skipping empty question ${questionNumber}`);
                return;
            }
            
            // Split into lines for processing
            const lines = fullBlock.split('\n').map(l => l.trim()).filter(l => l);
            
            let questionText = '';
            let answerText = '';
            let explanation = '';
            let foundAnswer = false;
            let collectingQuestion = true;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip empty lines
                if (!line) continue;
                
                // Stop at separator lines
                if (line.match(/^-{3,}$/)) {
                    break;
                }
                
                // Skip lines that look like metadata
                if (line.match(/^(General line|Conditions|Task|Requirements|Keywords|Option [A-Z]|\/\*.*\*\/|Lines \d+-\d+ omitted):/i)) {
                    continue;
                }
                
                // Check if this is an answer line
                if (!foundAnswer) {
                    // Multiple answer formats - be very flexible
                    const answerPatterns = [
                        /^ans[-:\s]+(.+)/i,
                        /^answer[-:\s]+(.+)/i,
                        /^correct answer[-:\s]+(.+)/i,
                        /^answers?[-:\s]+([A-D]\).*)/i,  // "Answer: A)" or "Answers: A) and C)"
                        /^[A-D][\.\)]\s*([A-Z].{15,})/,  // Option format: "A. Use Amazon..."
                        /^([A-D][\.\)]\s+[A-Z].{15,})/   // Without capture group
                    ];
                    
                    for (const pattern of answerPatterns) {
                        const ansMatch = line.match(pattern);
                        if (ansMatch) {
                            foundAnswer = true;
                            collectingQuestion = false;
                            answerText = ansMatch[1] || ansMatch[0].replace(/^(ans|answer|correct answer|answers)[-:\s]*/i, '');
                            answerText = answerText.trim();
                            break;
                        }
                    }
                    
                    if (foundAnswer) continue;
                }
                
                // Check if this line starts with question number (first line)
                const firstLineMatch = line.match(/^(\d+)[\]\)\.]\s*(.+)/);
                if (firstLineMatch && i === 0) {
                    questionText = firstLineMatch[2];
                    continue;
                }
                
                // Collect question text (before answer is found)
                if (collectingQuestion && !foundAnswer) {
                    // Stop collecting question if we hit "Which solution" or similar
                    if (line.match(/^(Which|What|How) (solution|approach|combination|design|method|steps)/i) && questionText.length > 100) {
                        questionText += ' ' + line;
                        continue;
                    }
                    questionText += ' ' + line;
                } 
                // Collect explanation (after answer is found)
                else if (foundAnswer && explanation.length < 1500) {
                    // Skip very short lines or lines that look like formatting
                    if (line.length > 5 && !line.match(/^\*+$/)) {
                        explanation += line + ' ';
                    }
                }
            }
            
            // Clean up text
            questionText = questionText.trim()
                .replace(/\s+/g, ' ')
                .replace(/\s+([.,?!])/g, '$1');
            
            answerText = answerText.trim()
                .replace(/\s+/g, ' ')
                .replace(/^[A-D][\.\)]\s*/, '');  // Remove leading option letter
            
            explanation = explanation.trim()
                .replace(/\s+/g, ' ');
            
            // Validation - be very lenient to catch all questions
            if (questionText.length > 20) {
                
                // If no answer found but question is valid, use a placeholder
                if (!answerText || answerText.length < 5) {
                    answerText = 'Answer not provided in source material';
                    console.log(`⚠️ Question ${questionNumber} has no answer, using placeholder`);
                }
                
                const choices = this.generateChoicesFromAnswer(answerText);
                
                this.questions.push({
                    number: questionNumber,
                    question: questionText,
                    choices: choices,
                    correctAnswer: 0,
                    explanation: explanation || answerText
                });
            } else if (questionText.length > 0) {
                console.log(`⚠️ Question ${questionNumber} too short (${questionText.length} chars): "${questionText.substring(0, 50)}..."`);
            }
        });
        
        // Sort by question number (for now, will shuffle later)
        this.questions.sort((a, b) => a.number - b.number);
        
        // Remove duplicates
        const uniqueQuestions = [];
        const seenNumbers = new Set();
        const duplicates = [];
        for (const q of this.questions) {
            if (!seenNumbers.has(q.number)) {
                seenNumbers.add(q.number);
                uniqueQuestions.push(q);
            } else {
                duplicates.push(q.number);
            }
        }
        this.questions = uniqueQuestions;
        
        // Shuffle questions for random order
        this.shuffleArray(this.questions);
        
        console.log(`✅ Loaded ${this.questions.length} questions (randomized)`);
        console.log(`📊 First 10: ${this.questions.slice(0, 10).map(q => q.number).join(', ')}`);
        console.log(`📊 Last 10: ${this.questions.slice(-10).map(q => q.number).join(', ')}`);
        if (duplicates.length > 0) {
            console.log(`⚠️ Removed ${duplicates.length} duplicates: ${duplicates.slice(0, 5).join(', ')}...`);
        }
        
        // Check for gaps in question numbers
        const gaps = [];
        for (let i = 1; i < this.questions.length; i++) {
            const expected = this.questions[i-1].number + 1;
            const actual = this.questions[i].number;
            if (actual > expected + 1) {
                for (let missing = expected; missing < actual; missing++) {
                    gaps.push(missing);
                }
            }
        }
        if (gaps.length > 0) {
            console.log(`⚠️ Missing ${gaps.length} questions: ${gaps.slice(0, 20).join(', ')}${gaps.length > 20 ? '...' : ''}`);
        }
        
        // Update UI
        if (this.questions.length > 0) {
            document.getElementById('questionCounter').textContent = 
                `Question 1 of ${this.questions.length}`;
            document.getElementById('scoreCounter').textContent = 
                `Score: 0/${this.questions.length}`;
        }
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle algorithm for true randomization
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generateChoicesFromAnswer(correctAnswer) {
        // Generate plausible but incorrect alternatives
        const choices = [correctAnswer];
        
        // Pool of generic wrong answers for AWS SAA exam
        const wrongAnswerPool = [
            'Use Amazon EC2 instances with Amazon EBS volumes and configure manual snapshots for backup',
            'Deploy Amazon CloudFront with S3 as the origin and enable geo-restriction',
            'Implement AWS Lambda with Amazon DynamoDB and enable point-in-time recovery',
            'Use Amazon RDS Multi-AZ deployment with automated backups',
            'Configure Amazon ElastiCache for Redis with cluster mode enabled',
            'Deploy an Application Load Balancer with sticky sessions enabled',
            'Use Amazon Kinesis Data Streams with on-demand capacity mode',
            'Implement AWS Step Functions with AWS Fargate for container orchestration',
            'Configure Amazon EFS with bursting throughput mode',
            'Use Amazon SQS standard queue with dead-letter queue configuration',
            'Deploy Amazon API Gateway with Lambda authorizers',
            'Implement Amazon Route 53 with failover routing policy',
            'Use AWS Direct Connect with BGP routing',
            'Configure Amazon VPC with NAT instances in multiple Availability Zones',
            'Deploy AWS Elastic Beanstalk with rolling deployment strategy',
            'Use Amazon Redshift with manual snapshots and cross-region replication',
            'Implement AWS Storage Gateway cached volumes',
            'Configure Amazon CloudWatch Logs with metric filters and alarms',
            'Use AWS Systems Manager Parameter Store for configuration management',
            'Deploy Amazon ECS on EC2 with service auto scaling'
        ];
        
        // Shuffle and select 3 wrong answers that are different from correct answer
        const availableWrong = wrongAnswerPool.filter(wa => {
            const correctLower = correctAnswer.toLowerCase();
            const wrongLower = wa.toLowerCase();
            // Make sure they don't share too many key services
            const correctServices = correctLower.match(/amazon \w+|aws \w+/g) || [];
            const wrongServices = wrongLower.match(/amazon \w+|aws \w+/g) || [];
            const overlap = correctServices.filter(s => wrongServices.some(w => w === s)).length;
            return overlap < 2;
        });
        
        // Shuffle and take 3
        const shuffled = availableWrong.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            choices.push(shuffled[i]);
        }
        
        // If we don't have enough, add generic ones
        while (choices.length < 4) {
            choices.push(`Alternative solution ${choices.length}: Configure AWS services with high availability`);
        }
        
        // Shuffle choices but remember correct answer
        const correctAnswerText = choices[0];
        choices.sort(() => Math.random() - 0.5);
        
        // Return with correct answer marker
        return choices.map((choice) => ({
            text: choice,
            isCorrect: choice === correctAnswerText
        }));
    }

    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;

        const container = document.getElementById('quizContainer');
        const controls = document.getElementById('quizControls');
        
        controls.style.display = 'flex';

        // Shuffle choices to randomize answer positions
        const shuffledChoices = [...question.choices];
        this.shuffleArray(shuffledChoices);
        
        const choicesHtml = shuffledChoices.map((choice, index) => `
            <div class="choice" data-choice-id="${question.choices.indexOf(choice)}">
                <span class="choice-label">${String.fromCharCode(65 + index)}.</span>
                <span class="choice-text">${choice.text}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="question-container">
                <div class="question-text">
                    <strong>Question ${this.currentQuestionIndex + 1}:</strong> ${question.question}
                </div>
                <div class="choices">
                    ${choicesHtml}
                </div>
                <div id="explanationContainer"></div>
            </div>
        `;

        // Update progress
        this.updateProgress();
        
        // Setup choice click handlers
        document.querySelectorAll('.choice').forEach(choice => {
            choice.addEventListener('click', () => this.selectChoice(choice));
        });

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    selectChoice(choiceElement) {
        // Don't allow selection if already answered
        if (this.userAnswers[this.currentQuestionIndex] !== undefined) return;

        const choiceId = parseInt(choiceElement.dataset.choiceId);
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = question.choices[choiceId].isCorrect;

        // Mark user's answer
        this.userAnswers[this.currentQuestionIndex] = choiceId;

        // Disable all choices
        document.querySelectorAll('.choice').forEach(choice => {
            choice.classList.add('disabled');
        });

        // Show result
        if (isCorrect) {
            choiceElement.classList.add('correct');
            choiceElement.innerHTML += '<span class="choice-icon">✓</span>';
            this.score++;
        } else {
            choiceElement.classList.add('incorrect');
            choiceElement.innerHTML += '<span class="choice-icon">✗</span>';
            
            // Highlight correct answer
            document.querySelectorAll('.choice').forEach((choice) => {
                const cId = parseInt(choice.dataset.choiceId);
                if (question.choices[cId].isCorrect) {
                    choice.classList.add('correct');
                    choice.innerHTML += '<span class="choice-icon">✓</span>';
                }
            });
        }

        // Show explanation
        this.showExplanation(isCorrect);
        
        // Update score
        this.updateScore();
    }

    showExplanation(isCorrect) {
        const question = this.questions[this.currentQuestionIndex];
        const container = document.getElementById('explanationContainer');
        
        const resultClass = isCorrect ? 'correct' : 'incorrect';
        const resultText = isCorrect ? '✓ Correct Answer' : '✗ Wrong Answer';
        
        container.innerHTML = `
            <div class="explanation ${resultClass}">
                <h3 class="${resultClass}">${resultText}</h3>
                <p>${question.explanation}</p>
            </div>
        `;
    }

    updateProgress() {
        const totalPages = Math.ceil(this.questions.length / this.questionsPerPage);
        
        document.getElementById('questionCounter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`;
        document.getElementById('paginationInfo').textContent = 
            `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('pageInfo').textContent = 
            `Page ${this.currentPage} of ${totalPages}`;
    }

    updateScore() {
        const answered = this.userAnswers.filter(a => a !== undefined).length;
        document.getElementById('scoreCounter').textContent = 
            `Score: ${this.score}/${answered}`;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');
        
        const totalPages = Math.ceil(this.questions.length / this.questionsPerPage);
        const pageStartIndex = (this.currentPage - 1) * this.questionsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + this.questionsPerPage - 1, this.questions.length - 1);
        
        // Question navigation
        prevBtn.disabled = this.currentQuestionIndex === pageStartIndex;
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.textContent = 'Finish Quiz';
        } else if (this.currentQuestionIndex === pageEndIndex) {
            nextBtn.textContent = 'Next Page →';
        } else {
            nextBtn.textContent = 'Next →';
        }
        
        // Page navigation
        firstPageBtn.disabled = this.currentPage === 1;
        prevPageBtn.disabled = this.currentPage === 1;
        nextPageBtn.disabled = this.currentPage === totalPages;
        lastPageBtn.disabled = this.currentPage === totalPages;
    }

    nextQuestion() {
        const pageEndIndex = Math.min((this.currentPage * this.questionsPerPage) - 1, this.questions.length - 1);
        
        if (this.currentQuestionIndex < this.questions.length - 1) {
            if (this.currentQuestionIndex === pageEndIndex) {
                // Move to next page
                this.nextPage();
            } else {
                this.currentQuestionIndex++;
                this.renderQuestion();
            }
        } else {
            this.showResults();
        }
    }

    previousQuestion() {
        const pageStartIndex = (this.currentPage - 1) * this.questionsPerPage;
        
        if (this.currentQuestionIndex > pageStartIndex) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        } else if (this.currentPage > 1) {
            // Move to previous page
            this.previousPage();
        }
    }

    goToPage(pageNumber) {
        const totalPages = Math.ceil(this.questions.length / this.questionsPerPage);
        if (pageNumber < 1 || pageNumber > totalPages) return;
        
        this.currentPage = pageNumber;
        this.currentQuestionIndex = (pageNumber - 1) * this.questionsPerPage;
        this.renderQuestion();
    }

    firstPage() {
        this.goToPage(1);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.questions.length / this.questionsPerPage);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    lastPage() {
        const totalPages = Math.ceil(this.questions.length / this.questionsPerPage);
        this.goToPage(totalPages);
    }

    showResults() {
        const container = document.getElementById('quizContainer');
        const controls = document.getElementById('quizControls');
        const results = document.getElementById('results');
        
        container.style.display = 'none';
        controls.style.display = 'none';
        results.style.display = 'block';
        
        const percentage = (this.score / this.questions.length) * 100;
        let scoreClass = 'score-poor';
        let message = 'Keep practicing! 💪';
        
        if (percentage >= 80) {
            scoreClass = 'score-good';
            message = 'Excellent work! 🌟';
        } else if (percentage >= 60) {
            scoreClass = 'score-medium';
            message = 'Good effort! 👍';
        }
        
        document.getElementById('finalScore').innerHTML = `
            <div class="${scoreClass}">
                <div style="font-size: 42px; font-weight: bold; margin-bottom: 15px;">
                    ${this.score} / ${this.questions.length}
                </div>
                <div style="font-size: 24px; margin-bottom: 15px;">
                    ${percentage.toFixed(1)}%
                </div>
                <div style="font-size: 18px;">
                    ${message}
                </div>
            </div>
        `;
    }

    restart() {
        this.currentQuestionIndex = 0;
        this.currentPage = 1;
        this.score = 0;
        this.userAnswers = [];
        
        // Shuffle questions again for new random order
        this.shuffleArray(this.questions);
        
        document.getElementById('quizContainer').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        
        this.renderQuestion();
    }

    setupEventListeners() {
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousQuestion();
        });
        
        document.getElementById('firstPageBtn').addEventListener('click', () => {
            this.firstPage();
        });
        
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.previousPage();
        });
        
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.nextPage();
        });
        
        document.getElementById('lastPageBtn').addEventListener('click', () => {
            this.lastPage();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }
}

// Initialize quiz when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Quiz();
});
