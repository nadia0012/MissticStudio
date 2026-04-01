var lastScrollTop = 0;
var navbar = document.getElementById("navbar");

window.addEventListener("scroll", function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
        navbar.style.top = "-80px";
    } else {
        navbar.style.top = "0";
    }
    lastScrollTop = scrollTop;
});

// MP4 Video autoplay/pause on scroll
const trailerVideo = document.getElementById('trailer-video');

console.log('Video element trouvé:', trailerVideo);

if (trailerVideo) {
    trailerVideo.muted = true;

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            console.log('ratio:', entry.intersectionRatio, '| intersecting:', entry.isIntersecting);
            if (entry.isIntersecting) {
                trailerVideo.play().then(() => {
                    console.log('✅ Video playing');
                }).catch(err => {
                    console.error('❌ Play bloqué:', err);
                });
            } else {
                trailerVideo.pause();
                console.log('⏸ Video paused');
            }
        });
    }, {
        threshold: [0, 0.1]
    });

    videoObserver.observe(trailerVideo);
    console.log('Observer attaché à:', trailerVideo.id);
}

// Image Modal - Click to Enlarge
const thumbnailContainer = document.querySelector('.thumbnail-container');
const screenshotContainer = document.querySelectorAll('.screenshot-container');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalBackdrop = document.querySelector('.modal-backdrop');

// Open modal when thumbnail is clicked
if (thumbnailContainer) {
    thumbnailContainer.addEventListener('click', function(e) {
        // Prevent download button from triggering modal
        if (e.target.closest('.download-btn')) {
            return;
        }
        
        const imgSrc = this.querySelector('.thumbnail-image').src;
        modalImage.src = imgSrc;
        modalDownloadBtn.href = imgSrc;
        modalDownloadBtn.download = imgSrc.split('/').pop();
        imageModal.classList.add('active');
    });
}

// Open modal when screenshot is clicked
screenshotContainer.forEach(container => {
    container.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) {
            return;
        }
        
        const imgSrc = this.querySelector('.screenshot-image').src;
        modalImage.src = imgSrc;
        modalDownloadBtn.href = imgSrc;
        modalDownloadBtn.download = imgSrc.split('/').pop();
        imageModal.classList.add('active');
    });
});

// Close modal when X button is clicked
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', function() {
        imageModal.classList.remove('active');
    });
}

// Close modal when backdrop is clicked
if (modalBackdrop) {
    modalBackdrop.addEventListener('click', function() {
        imageModal.classList.remove('active');
    });
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && imageModal.classList.contains('active')) {
        imageModal.classList.remove('active');
    }
});

var swiper = new Swiper(".mySwiper", {
    spaceBetween: 0,
    loop: false,
    slidesPerView: 1,
    centeredSlides: true,
    autoplay: {
        delay: 10000,
        disableOnInteraction: false,
    },
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
});

const pauseBtn = document.getElementById("pauseBtn");
let isPaused = false;

const playIcon = `<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
    <rect x="0" y="0" width="3" height="12" rx="1" fill="currentColor"/>
    <rect x="7" y="0" width="3" height="12" rx="1" fill="currentColor"/>
</svg>`;

const pauseIcon = `<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
    <path d="M0 0L10 6L0 12Z" fill="currentColor"/>
</svg>`;

if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
        if (isPaused) {
            swiper.autoplay.resume();
            pauseBtn.innerHTML = playIcon;
            const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
            if (activeBullet) activeBullet.style.setProperty("--animation-state", "running");
        } else {
            swiper.autoplay.pause();
            pauseBtn.innerHTML = pauseIcon;
            const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
            if (activeBullet) activeBullet.style.setProperty("--animation-state", "paused");
        }
        isPaused = !isPaused;
    });
}

swiper.on("slideChange", () => {
    if (pauseBtn && isPaused) {
        isPaused = false;
        pauseBtn.innerHTML = playIcon;
    }
    
    // reset l'animation sur le nouveau bullet actif
    setTimeout(() => {
        const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
        if (activeBullet) {
            activeBullet.style.setProperty("--animation-state", "running");
            // force le reset de l'animation
            activeBullet.style.animation = "none";
            activeBullet.offsetHeight; // force reflow
            activeBullet.style.animation = "";
        }
    }, 50);
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');

if (hamburgerBtn && sidebar && sidebarOverlay && sidebarClose) {
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    });

    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
}