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

swiper.on("slideChange", () => {
    if (isPaused) {
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

(function () {
    const wrapper = document.getElementById('trailer-wrapper');
    let player = null;
    let playerReady = false;

    function loadYTApi() {
        if (document.getElementById('yt-api')) return;
        const tag = document.createElement('script');
        tag.id = 'yt-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('trailer-iframe', {
            events: {
                onReady: function () {
                    playerReady = true;
                }
            }
        });
    };

    loadYTApi();

    // IntersectionObserver : pause quand hors écran, play quand visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!playerReady || !player) return;
            if (entry.isIntersecting) {
                player.playVideo();
            } else {
                player.pauseVideo();
            }
        });
    }, { threshold: 0.4 });

    observer.observe(wrapper);
})();