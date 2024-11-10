app.component('nav-bar', {
    props: ['user_profile'],
    
    data() {
        return {
            currentPage: '',
            defaultAvatar: 'resources/download.jpeg',
            isMenuOpen: false
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
        },
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        }
    },

    template: `
        <nav class="navbar navbar-expand-sm navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand" href="index.html">
                    <img src="resources/mappalettelogo.png" alt="MapPalette Logo">MapPalette
                </a>
                <button class="navbar-toggler" 
                        type="button" 
                        @click="toggleMenu"
                        :aria-expanded="isMenuOpen">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" 
                     :class="{ 'show': isMenuOpen }" 
                     id="navbarNav">
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