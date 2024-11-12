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
                "The voice inside your head that says you can't do this is a liar."
            ],
            currentQuote: ""
        }
    },
    mounted() {
        // Display a random quote initially and start rotation
        this.displayRandomQuote();
        setInterval(this.displayRandomQuote, 5000);
    },
    methods: {
        displayRandomQuote() {
            const randomIndex = Math.floor(Math.random() * this.quotes.length);
            // Remove the quote temporarily to trigger re-animation
            this.currentQuote = '';
            // Use setTimeout to ensure the DOM has updated
            setTimeout(() => {
                this.currentQuote = this.quotes[randomIndex];
            }, 10);
        }
    },
    template: `
        <div id="loading-spinner" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 flashy-quote">{{ currentQuote }}</p>
        </div>
    `
});