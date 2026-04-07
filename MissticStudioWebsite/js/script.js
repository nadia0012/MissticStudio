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
const screenshotContainers = document.querySelectorAll('.screenshot-container');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalBackdrop = document.querySelector('.modal-backdrop');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');

const screenshots = Array.from(document.querySelectorAll('.screenshot-image'));
let currentIndex = 0;

function openModal(index) {
    currentIndex = index;
    const src = screenshots[currentIndex].src;
    modalImage.src = src;
    modalDownloadBtn.href = src;
    modalDownloadBtn.download = src.split('/').pop();
    if (modalPrev) modalPrev.disabled = currentIndex === 0;
    if (modalNext) modalNext.disabled = currentIndex === screenshots.length - 1;
    imageModal.classList.add('active');
}

// Open modal when screenshot is clicked
screenshotContainers.forEach((container, index) => {
    container.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) return;
        openModal(index);
    });
});

// Flèches de navigation
if (modalPrev) {
    modalPrev.addEventListener('click', () => {
        if (currentIndex > 0) openModal(currentIndex - 1);
    });
}

if (modalNext) {
    modalNext.addEventListener('click', () => {
        if (currentIndex < screenshots.length - 1) openModal(currentIndex + 1);
    });
}

// Close modal
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => imageModal.classList.remove('active'));
}

if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => imageModal.classList.remove('active'));
}

// Clavier
document.addEventListener('keydown', (e) => {
    if (!imageModal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft' && modalPrev) modalPrev.click();
    if (e.key === 'ArrowRight' && modalNext) modalNext.click();
    if (e.key === 'Escape') imageModal.classList.remove('active');
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

document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // Fermer la sidebar
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');

        // Si c'est une ancre (#games, #contact, etc.)
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        }
    });
});

(function () {
    const form = document.querySelector('.contact-form');
    const wrapper = document.querySelector('.submit-wrapper');
    const btn = form.querySelector('button[type="submit"]');
    const requiredFields = form.querySelectorAll('[required]');

    function checkValidity() {
        const allFilled = Array.from(requiredFields).every(field => {
            if (field.type === 'file') return field.files.length > 0;
            return field.value.trim() !== '';
        });

        if (allFilled) {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = '';
            wrapper.classList.remove('form-invalid');
        } else {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
            wrapper.classList.add('form-invalid');
        }
    }

    requiredFields.forEach(field => {
        field.addEventListener('input', checkValidity);
        field.addEventListener('change', checkValidity); // pour le file input
    });

    checkValidity(); // état initial
})();