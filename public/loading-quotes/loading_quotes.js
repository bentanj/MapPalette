// loading_quotes.js
app.component('loading-quotes', {
    data() {
        return {
            quotes: [
                "Every mile is two in winter.",
                "The pain of running is temporary. The pride of finishing lasts forever.",
                "Run when you can, walk if you have to, crawl if you must, but never give up.",
                "It's not about being the best. It's about being better than you were yesterday.",
                "Running is the greatest metaphor for life, because you get out of it what you put into it.",
                "The only bad workout is the one that didn't happen.",
                "Your legs are not giving out. Your head is giving up. Keep going.",
                "There is no finish line. Just a new starting point.",
                "You don't have to go fast, you just have to go.",
                "The voice inside your head that says you can't do this is a liar.",
                "Run like there's a fire behind you.",
                "One run can change your day, many runs can change your life.",
                "The only bad run is the one that didn't happen.",
                "Running is the greatest metaphor for life because you get out of it what you put into it.",
                "Pain is temporary, pride is forever.",
                "The miracle isn't that I finished. The miracle is that I had the courage to start.",
                "You're only one run away from a good mood.",
                "Run when you can, walk if you have to, crawl if you must; just never give up.",
                "Don't dream of winning, train for it."
            ],
            currentQuote: "",
            isLoading: true
        }
    },
    mounted() {
        this.displayRandomQuote();
        setInterval(this.displayRandomQuote, 5000);
    },
    methods: {
        displayRandomQuote() {
            const randomIndex = Math.floor(Math.random() * this.quotes.length);
            this.currentQuote = '';
            setTimeout(() => {
                this.currentQuote = this.quotes[randomIndex];
            }, 10);
        }
    },
    template: `
        <div id="loading-spinner" class="loading-container">
            <div class="loading-content">
                <!-- Progress Bar with Runner -->
                <div class="progress-wrapper">
                    <!-- Running kid above progress bar -->
                    <div class="gif-runner"></div>
                    
                    <!-- Progress Bar -->
                    <div class="custom-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>

                <!-- SVG Runner Container
                <div class="runner-container">
                    <div class="svg-runner"></div>
                </div>-->

                <!-- Quote Display -->
                <div class="quote-container">
                    <p class="flashy-quote mb-0">{{ currentQuote }}</p>
                </div>
            </div>
        </div>
    `
});



