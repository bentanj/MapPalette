app.component('nav-bar', {
    // get user profile from parent
    props: ['user_profile'], 
    
    data() {
        return {
            currentPage: '',
            defaultAvatar: 'resources/default-profile.png'
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
                <a class="navbar-brand" href="homepage.html">
                    <img src="resources/mappalettelogo.png" alt="MapPalette Logo" style="width: 40px; height: 40px" >MapPalette
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
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link" 
                               :class="{ 'active': isCurrentPage('homepage.html') }" 
                               href="homepage.html">Feed</a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" 
                               :class="{ 'active': isSearchRelatedPage() }"
                               href="#" 
                               id="searchDropdown" 
                               role="button" 
                               data-bs-toggle="dropdown" 
                               aria-expanded="false">
                                Search
                            </a>
                            <ul class="dropdown-menu" aria-labelledby="searchDropdown">
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('routes.html') }"
                                       href="routes.html">Routes</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('friends.html') }"
                                       href="friends.html">Friends</a>
                                </li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" 
                               :class="{ 'active': isCurrentPage('addMaps.html') }"
                               href="addMaps.html">Draw</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link"
                               :class="{ 'active': isCurrentPage('leaderboard.html') }"
                               href="leaderboard.html">Leaderboard</a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle d-flex align-items-center profile-link"
                               :class="{ 'active': false }"
                               href="#" 
                               id="profileDropdown" 
                               role="button" 
                               data-bs-toggle="dropdown" 
                               aria-expanded="false">
                                <img :src="user_profile?.avatar || defaultAvatar" 
                                     alt="Profile" 
                                     class="rounded-circle" 
                                     width="50" 
                                     height="50">
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end" 
                                aria-labelledby="profileDropdown">
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('profile_page.html') }"
                                       href="profile_page.html">Your Profile</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('settings_page.html') }"
                                       href="settings_page.html">Settings</a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" id='logout'>Log Out</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `
});