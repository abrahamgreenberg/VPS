const toggleButton = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (toggleButton && navLinks) {
  toggleButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  });
}

const pageName = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-links a").forEach((link) => {
  const href = link.getAttribute("href");
  if (href === pageName) {
    link.classList.add("active");
  }
});

const writingPages = new Set([
  "writing.html",
  "article-1.html",
  "article-2.html",
  "article-3.html",
  "article-4.html",
  "article-5.html",
  "article-6.html",
]);
const writingLink = document.querySelector(".writing-link");
if (writingLink && writingPages.has(pageName)) {
  writingLink.classList.add("active");
}

const dropdownParent = document.querySelector(".has-dropdown");
if (dropdownParent && writingLink) {
  let closeTimer = null;

  const openDropdown = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    dropdownParent.classList.add("is-open");
    writingLink.setAttribute("aria-expanded", "true");
  };

  const closeDropdownWithDelay = () => {
    if (window.matchMedia("(max-width: 720px)").matches) {
      return;
    }
    closeTimer = setTimeout(() => {
      dropdownParent.classList.remove("is-open");
      writingLink.setAttribute("aria-expanded", "false");
      closeTimer = null;
    }, 220);
  };

  dropdownParent.addEventListener("mouseenter", openDropdown);
  dropdownParent.addEventListener("mouseleave", closeDropdownWithDelay);
  dropdownParent.addEventListener("focusin", openDropdown);
  dropdownParent.addEventListener("focusout", closeDropdownWithDelay);

  writingLink.addEventListener("click", (event) => {
    if (!window.matchMedia("(max-width: 720px)").matches) {
      return;
    }

    event.preventDefault();
    const mobileOpen = dropdownParent.classList.toggle("mobile-open");
    writingLink.setAttribute("aria-expanded", String(mobileOpen));
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 720px)").matches) {
      dropdownParent.classList.remove("mobile-open");
      writingLink.setAttribute("aria-expanded", "false");
    }
  });
}

const yearSlot = document.getElementById("year");
if (yearSlot) {
  yearSlot.textContent = new Date().getFullYear();
}
