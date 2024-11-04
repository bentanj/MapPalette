app.component('nav-bar', {
    // get user profile from parent
    props: ['user_profile'], 
    
    data() {
        return {
            currentPage: '',
            defaultAvatar: 'resources/download.jpeg'
        }
    },

    mounted() {
        this.currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
    },

    methods: {
        isCurrentPage(pageName) {
            return this.currentPage === pageName;
        },
        isSearchRelatedPage() {
            return ['routes.html', 'friends.html'].includes(this.currentPage);
        },
        isProfileRelatedPage() {
            return ['profile_page.html', 'settings_page.html'].includes(this.currentPage);
        },
        isLeaderboardsPage() {
            return this.currentPage === 'leaderboard.html';
        }
    },

    template: `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand" href="index.html">
                    <img src="resources/mappalettelogo.png" alt="MapPalette Logo" style="width: 40px; height: 40px">MapPalette
                </a>
                <button class="navbar-toggler" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav" 
                        aria-expanded="false" 
                        aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item">
                            <a class="nav-link btn btn-outline-primary" href="login.html">Login</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link btn btn-primary" href="signup.html">Sign Up</a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `
});