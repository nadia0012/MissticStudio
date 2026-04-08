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
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;

    const overlay = document.getElementById('formSuccessOverlay');
    const wrapper = document.querySelector('.submit-wrapper');
    const btn = contactForm.querySelector('button');
    const requiredFields = contactForm.querySelectorAll('[required]');
    const emailField = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- 1. FONCTION DE VALIDATION ---
    function checkValidity() {
        const emailValid = emailRegex.test(emailField.value.trim());

        const allFilled = Array.from(requiredFields).every(field => {
            if (field.id === 'email') return emailValid;
            if (field.type === 'file') return field.files.length > 0;
            return field.value.trim() !== '';
        });

        if (allFilled) {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
            wrapper.classList.remove('form-invalid');
        } else {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
            wrapper.classList.add('form-invalid');
        }
    }

    // --- 2. ÉCOUTEURS D'ÉVÉNEMENTS ---
    requiredFields.forEach(field => {
        field.addEventListener('input', checkValidity);
        field.addEventListener('change', checkValidity);
    });

    // Feedback visuel email (seulement quand on quitte le champ)
    emailField.addEventListener('blur', () => {
        if (emailField.value.trim() && !emailRegex.test(emailField.value.trim())) {
            emailField.classList.add('invalid');
        } else {
            emailField.classList.remove('invalid');
        }
    });

    emailField.addEventListener('input', () => {
        emailField.classList.remove('invalid');
    });

    // --- 3. DÉCLENCHEMENT DE L'OVERLAY ET RESET ---
    wrapper.addEventListener('click', function (e) {
        e.preventDefault();
        if (btn.classList.contains('disabled')) return;

        if (overlay) {
            overlay.classList.add('visible');

            const allInputs = contactForm.querySelectorAll('input, textarea');
            allInputs.forEach(input => {
                input.value = '';
                if (input.type === 'file') input.value = null;
            });

            selectedFiles = [];
            uploadedArea.innerHTML = '';
            emailField.classList.remove('invalid');

            checkValidity();

            setTimeout(() => {
                overlay.classList.remove('visible');
            }, 3000);
        }
    });

    // État initial
    checkValidity();
})();


const fileInput = document.getElementById('attachment');
const uploadedArea = document.querySelector('.uploaded-area');

const fileSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 44 59" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M25.6667 0H5.5C4.04131 0 2.64236 0.579462 1.61091 1.61091C0.579462 2.64236 0 4.04131 0 5.5V53.1667C0 54.6254 0.579462 56.0243 1.61091 57.0558C2.64236 58.0872 4.04131 58.6667 5.5 58.6667H38.5C39.9587 58.6667 41.3576 58.0872 42.3891 57.0558C43.4205 56.0243 44 54.6254 44 53.1667V18.3333H43.9853L25.6667 0ZM22 5.88133V21.0833C22 21.5893 22.4107 22 22.9167 22H38.1223C38.3036 21.9996 38.4806 21.9455 38.6311 21.8445C38.7816 21.7435 38.8987 21.6002 38.9678 21.4327C39.0369 21.2651 39.0547 21.0808 39.0191 20.9032C38.9835 20.7255 38.896 20.5623 38.7677 20.4343L23.5657 5.23233C23.4375 5.1038 23.274 5.01624 23.096 4.98073C22.9179 4.94522 22.7334 4.96338 22.5657 5.0329C22.3979 5.10241 22.2547 5.22016 22.154 5.3712C22.0533 5.52225 21.9997 5.6998 22 5.88133Z" fill="#472952"/>
</svg>`;

const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" style="cursor:pointer; flex-shrink:0;">
    <path d="M18 6L6 18M6 6l12 12" stroke="#A077AF" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// Stocke les fichiers sélectionnés dans un tableau
let selectedFiles = [];

fileInput.addEventListener('change', function () {
    const newFiles = Array.from(this.files);
    
    // Ajoute les nouveaux fichiers sans écraser les anciens
    newFiles.forEach(newFile => {
        const alreadyExists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size);
        if (!alreadyExists) selectedFiles.push(newFile);
    });

    renderFiles();
});

function renderFiles() {
    uploadedArea.innerHTML = '';

    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files

    selectedFiles.forEach((file, index) => {
        let fileName = file.name;
        if (fileName.length >= 20) {
            const splitName = fileName.split('.');
            fileName = splitName[0].substring(0, 13) + '... .' + splitName[splitName.length - 1];
        }

        const fileSize = file.size < 1024 * 1024
            ? Math.floor(file.size / 1024) + ' KB'
            : (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        const li = document.createElement('li');
        li.classList.add('row');
        li.innerHTML = `
            <div class="content">
                ${fileSVG}
                <div class="details">
                    <span class="name">${fileName}</span>
                    <span class="size">${fileSize}</span>
                </div>
            </div>
            ${deleteSVG}
        `;

        // Bouton delete
        li.querySelector('svg:last-child').addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            renderFiles();
        });

        uploadedArea.appendChild(li);
    });
}