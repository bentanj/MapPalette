let slideIndex = 0;
const slideContainer = document.querySelector('.carousel-slide');
const slides = document.querySelectorAll('.carousel-item');

function moveSlide(n) {
    slideIndex += n;
    if (slideIndex >= slides.length) {
        slideIndex = 0;
    }
    if (slideIndex < 0) {
        slideIndex = slides.length - 1;
    }
    updateSlide();
}

function updateSlide() {
    slideContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
}

// Optional: Auto-slide functionality
setInterval(() => {
    moveSlide(1);
}, 5000); // Change slide every 5 seconds