window.onerror = function (msg, url, line) {
    alert("Script Error: " + msg + "\nLine: " + line);
    return false;
};

const API_URL = "https://script.google.com/macros/s/AKfycbxF5vhf-Z4KBBMbpwfodRC0gxSFXiG6Cm14_t6JVbpT9hqG3CVafcCM6XEOcX00Mks-/exec";

// Global State
let currentDate = new Date();
let bookedDates = []; // Format: "YYYY-MM-DD"
let bookingsMap = {}; // Format: { "YYYY-MM-DD": "Booker Name" }
let roomPricingConfig = {
    deluxe: { price: 1690, extraAdult: 500, child: 300 },
    suite: { price: 2190, extraAdult: 700, child: 400 },
    meals: { breakfast: 200, halfBoard: 800, fullBoard: 1200 }
};

/* ===========================
   Room Gallery Logic (Moved to Top)
   =========================== */
// ... (Gallery logic remains) ...

/* ===========================
   Public Price & Offer Sync
   =========================== */
function fetchPublicPrices() {
    const deluxePrice = document.getElementById('deluxePriceDisplay');
    const suitePrice = document.getElementById('suitePriceDisplay');
    const deluxeOffer = document.getElementById('deluxeOfferDisplay');
    const suiteOffer = document.getElementById('suiteOfferDisplay');

    // Only fetch if on booking page or if we need data for calculation
    // Actually, always fetch to update config for potential booking modal

    console.log("Fetching public prices...");

    fetch(API_URL + "?action=get_price_data")
        .then(res => res.json())
        .then(result => {
            if (result.success && result.data) {
                // Update Global Config
                roomPricingConfig.deluxe.price = parseInt(result.data.deluxePrice) || 1690;
                roomPricingConfig.deluxe.extraAdult = parseInt(result.data.deluxeExtraAdult) || 500;
                roomPricingConfig.deluxe.child = parseInt(result.data.deluxeChild) || 300;

                roomPricingConfig.suite.price = parseInt(result.data.suitePrice) || 2190;
                roomPricingConfig.suite.extraAdult = parseInt(result.data.suiteExtraAdult) || 700;
                roomPricingConfig.suite.child = parseInt(result.data.suiteChild) || 400;

                // Update Meal Config
                roomPricingConfig.meals.breakfast = parseInt(result.data.mealBreakfast) || 200;
                roomPricingConfig.meals.halfBoard = parseInt(result.data.mealHalfBoard) || 800;
                roomPricingConfig.meals.fullBoard = parseInt(result.data.mealFullBoard) || 1200;

                // Update Meal Dropdown Text if on Booking Page
                const mealSelect = document.getElementById('mealPlan');
                if (mealSelect) {
                    mealSelect.options[1].innerText = `Breakfast - ₹${roomPricingConfig.meals.breakfast}`;
                    mealSelect.options[1].dataset.price = roomPricingConfig.meals.breakfast;

                    mealSelect.options[2].innerText = `Breakfast + Lunch/Dinner - ₹${roomPricingConfig.meals.halfBoard}`;
                    mealSelect.options[2].dataset.price = roomPricingConfig.meals.halfBoard;

                    mealSelect.options[3].innerText = `Breakfast + Lunch + Dinner - ₹${roomPricingConfig.meals.fullBoard}`;
                    mealSelect.options[3].dataset.price = roomPricingConfig.meals.fullBoard;
                }

                // Update UI if elements exist
                if (deluxePrice) deluxePrice.innerText = result.data.deluxePrice || "1690";
                if (suitePrice) suitePrice.innerText = result.data.suitePrice || "2190";

                if (deluxeOffer) {
                    const off = result.data.deluxeOffer;
                    if (off && off !== "No Offers" && off.trim() !== "") {
                        deluxeOffer.innerText = off;
                        deluxeOffer.style.display = "flex";
                    } else {
                        deluxeOffer.style.display = "none";
                    }
                }

                if (suiteOffer) {
                    const off = result.data.suiteOffer;
                    if (off && off !== "No Offers" && off.trim() !== "") {
                        suiteOffer.innerText = off;
                        suiteOffer.style.display = "flex";
                    } else {
                        suiteOffer.style.display = "none";
                    }
                }
            }
        })
        .catch(err => console.error("Error fetching public prices:", err));
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    fetchPublicPrices();

    // Initialize Mobile Menu (Priority)
    initMobileMenu();

    // Check if we are on the admin page
    if (window.location.pathname.includes('admin.html')) {
        initAdmin();
    } else if (window.location.pathname.includes('booking.html')) {
        initBookingPage();
    } else {
        // Background sync on other pages (Home/Gallery)
        try { fetchBookedDates(true); } catch (e) { console.warn(e); }
        initQuickViewSlider(); // Initialize Slider on Home
        initReviews(); // Initialize Reviews
        initHeroSlider(); // Initialize Hero Auto Slider
    }

    // Initialize Hotel Booking if elements exist
    initHotelBooking();
});

/* ===========================
   Hero Auto-Slider Logic (Fade)
   =========================== */
function initHeroSlider() {
    const track = document.getElementById('heroSliderTrack');
    if (!track) return;

    const slides = track.querySelectorAll('.hero-slide');
    if (slides.length < 2) return;

    // Set initial state
    slides[0].classList.add('active');

    let currentIndex = 0;
    const intervalTime = 7000; // 7 seconds

    setInterval(() => {
        // Remove active from current
        slides[currentIndex].classList.remove('active');

        // Move to next
        currentIndex = (currentIndex + 1) % slides.length;

        // Add active to new
        slides[currentIndex].classList.add('active');
    }, intervalTime);
}
// updateHeroSlider function removed as logic is now direct class toggle

/* ===========================
   Tab Switching Logic
   =========================== */
function switchBookingTab(tab) {
    const weddingSection = document.getElementById('weddingBookingSection');
    const hotelSection = document.getElementById('hotelBookingSection');
    const btnWedding = document.getElementById('btnWeddingHall');
    const btnHotel = document.getElementById('btnHotelRoom');

    if (tab === 'wedding') {
        weddingSection.style.display = 'block';
        hotelSection.style.display = 'none';
        btnWedding.classList.add('active');
        btnHotel.classList.remove('active');
    } else {
        weddingSection.style.display = 'none';
        hotelSection.style.display = 'block';
        btnWedding.classList.remove('active');
        btnHotel.classList.add('active');
    }
}

/* ===========================
   Hotel Booking Logic
   =========================== */
function initHotelBooking() {
    const form = document.getElementById('hotelBookingForm');
    if (!form) return;

    // Date Validation Logic
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    // Set min date to today for Check-in
    const today = new Date().toISOString().split('T')[0];
    checkInInput.setAttribute('min', today);

    // Update Check-out min date when Check-in changes
    // Update Check-out min date and Auto-Select Next Day
    checkInInput.addEventListener('change', function () {
        if (this.value) {
            const checkInDate = new Date(this.value);
            const nextDay = new Date(checkInDate);
            nextDay.setDate(checkInDate.getDate() + 1);

            const nextDayStr = nextDay.toISOString().split('T')[0];
            checkOutInput.setAttribute('min', nextDayStr);

            // Auto-select one night stay
            checkOutInput.value = nextDayStr;

            // Trigger calculation
            calculatePrice();
        }
    });

    // Price Calculation Logic
    function calculatePrice() {
        const roomType = document.getElementById('roomType').value;
        const noOfRooms = parseInt(document.getElementById('noOfRooms').value) || 1;
        const adults = parseInt(document.getElementById('adults').value) || 1;
        const children = parseInt(document.getElementById('children').value) || 0;
        const checkIn = document.getElementById('checkIn').value;
        const checkOut = document.getElementById('checkOut').value;

        if (!roomType || !checkIn || !checkOut) {
            document.getElementById('totalPriceDisplay').innerText = "₹0";
            return 0;
        }

        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        // Calculate nights
        let timeDiff = endDate.getTime() - startDate.getTime();
        let nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (nights < 1) nights = 1;

        // Get Config based on Room Type
        let config = roomPricingConfig.deluxe; // Default
        if (roomType === 'Suite' || roomType === 'Executive Suite') {
            config = roomPricingConfig.suite;
        }

        const basePrice = config.price;
        const extraAdultRate = config.extraAdult;
        const childRate = config.child;

        // Formula:
        // Total = (BasePrice * Rooms * Nights) + (ExtraAdults * Rate * Nights) + (Children * Rate * Nights)

        // Extra Adult Calculation:
        // Base covers 1 adult per room.
        // Total Base Capacity = 1 * NoOfRooms
        // Extra Adults = Max(0, TotalAdults - Total Base Capacity)

        const totalBaseCapacity = 1 * noOfRooms;
        const extraAdults = Math.max(0, adults - totalBaseCapacity);

        const totalRoomCost = basePrice * noOfRooms * nights;
        const totalExtraAdultCost = extraAdults * extraAdultRate * nights;
        const totalChildCost = children * childRate * nights;

        // Meal Calculation: (Adults + Children) * MealPrice * Nights
        // Assuming Meal Price is per person per day
        const mealSelect = document.getElementById('mealPlan');
        let mealPrice = 0;
        let mealName = "No Meals";

        if (mealSelect) {
            const selectedOption = mealSelect.options[mealSelect.selectedIndex];
            mealPrice = parseInt(selectedOption.dataset.price) || 0;
            mealName = selectedOption.value;
        }

        const totalPeople = adults + children;
        const totalMealCost = totalPeople * mealPrice * nights;

        const grandTotal = totalRoomCost + totalExtraAdultCost + totalChildCost + totalMealCost;

        // Generate Breakdown
        const breakdownDiv = document.getElementById('priceBreakdownDisplay');
        if (breakdownDiv) {
            let html = `<div><strong>${roomType} Room:</strong> ₹${basePrice} × ${noOfRooms} room(s) × ${nights} night(s) = ₹${totalRoomCost}</div>`;

            if (extraAdults > 0) {
                html += `<div><strong>Extra Adults:</strong> ₹${extraAdultRate} × ${extraAdults} person(s) × ${nights} night(s) = ₹${totalExtraAdultCost}</div>`;
            }

            if (children > 0) {
                html += `<div><strong>Children:</strong> ₹${childRate} × ${children} child(ren) × ${nights} night(s) = ₹${totalChildCost}</div>`;
            }

            if (totalMealCost > 0) {
                html += `<div><strong>Meals (${mealName}):</strong> ₹${mealPrice} × ${totalPeople} person(s) × ${nights} night(s) = ₹${totalMealCost}</div>`;
            }

            breakdownDiv.innerHTML = html;
            breakdownDiv.style.display = 'block';
        }

        document.getElementById('totalPriceDisplay').innerText = "₹" + grandTotal;
        const paymentPageTotal = document.getElementById('paymentPageTotal');
        if (paymentPageTotal) paymentPageTotal.innerText = "₹" + grandTotal;

        return grandTotal;
    }

    // Helper: Select Room from Card (Moved to global scope)


    // Event Listeners for Calculation
    const calcElements = ['roomType', 'noOfRooms', 'adults', 'children', 'checkIn', 'checkOut', 'mealPlan'];
    calcElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calculatePrice);
        if (el) el.addEventListener('input', calculatePrice); // For number inputs typing
    });

    // Form Submission: Step 1 (Show Payment Selection)
    form.onsubmit = (e) => {
        e.preventDefault();

        // Basic Validation (Dates etc are required by defaults)

        // Hide Form, Show Payment Selection
        form.style.display = 'none';
        const paymentSection = document.getElementById('payment-selection-section');
        if (paymentSection) {
            paymentSection.style.display = 'block';
            paymentSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Global Functions for Payment Flow
    window.handlePaymentClick = async function (element, method) {
        if (element.classList.contains('processing')) return;
        element.classList.add('processing');

        // Show Spinner
        const originalHTML = element.innerHTML;
        element.innerHTML = '<div class="spinner"></div><br><span style="margin-top:10px; display:block; color: var(--secondary-color); font-weight:bold;">Processing...</span>';

        try {
            await confirmBooking(method);
        } catch (e) {
            console.error(e);
            element.innerHTML = originalHTML;
            element.classList.remove('processing');
        }
    };

    window.backToBookingForm = function () {
        document.getElementById('payment-selection-section').style.display = 'none';
        document.getElementById('hotelBookingForm').style.display = 'block';
    };

    window.confirmBooking = async function (paymentMethod) {
        // Show loading state on the clicked card? 
        // For simplicity, let's use a full screen overlay or just change cursor to wait
        document.body.style.cursor = 'wait';

        // Gather Data (from hidden form)
        const totalPrice = calculatePrice(); // Ensure fresh calcs
        // Re-read values for submission
        const mealSelect = document.getElementById('mealPlan');
        const mealPlan = mealSelect ? mealSelect.value : "No Meals";



        const data = {
            action: 'book_room', // Changed from bookRoom to book_room (Generic)
            full_name: document.getElementById('hotelName').value, // Matches Code.gs createHotelBooking
            mobile: "'" + document.getElementById('hotelMobile').value,
            room_type: document.getElementById('roomType').value,
            no_of_rooms: document.getElementById('noOfRooms').value, // Matches Code.gs
            adults: document.getElementById('adults').value,
            children: document.getElementById('children').value,
            check_in: document.getElementById('checkIn').value,
            check_out: document.getElementById('checkOut').value,
            price: totalPrice,
            payment_method: paymentMethod, // Matches Code.gs
            meal_plan: mealPlan
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                showThankYouModal(data.full_name, 'Hotel Room');

                // Reset everything
                form.reset();
                document.getElementById('totalPriceDisplay').innerText = "₹0";

                // Reset View
                document.getElementById('payment-selection-section').style.display = 'none';
                document.getElementById('hotelBookingForm').style.display = 'none';

            } else {
                alert("Booking Failed: " + result.message);
                // Go back to form to fix?
                backToBookingForm();
            }
        } catch (error) {
            console.error("Hotel Booking Error:", error);
            alert("Request sent! Use 'Check Status' to confirm later if processing delayed.");
        } finally {
            document.body.style.cursor = 'default';
        }
    };
}

/* ===========================
   Booking Page Logic
   =========================== */
async function initBookingPage() {
    // Check for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
        switchBookingTab(tab);
    }

    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return; // Safety check

    // Visual Feedback: Syncing State
    calendarGrid.innerHTML = '';
    renderCalendarHeaders(); // Keep headers visible

    // Fast Load from Cache
    const cached = localStorage.getItem('bookingData');
    if (cached) {
        processBookingData(JSON.parse(cached));
        renderCalendar(currentDate);
    } else {
        // Show loader only if no cache
        const loader = document.createElement('div');
        loader.id = 'calendarLoader';
        loader.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--primary-color); font-weight: 600;";
        loader.innerHTML = '<div class="spinner"></div> Syncing data...';
        calendarGrid.appendChild(loader);
    }

    // Fetch fresh data in background
    await fetchBookedDates();

    // Remove loader if it exists
    const loader = document.getElementById('calendarLoader');
    if (loader) loader.remove();

    // Re-render with fresh data always
    renderCalendar(currentDate);

    // Event Listeners for Month Navigation
    // Use onclick to avoid duplicate listeners if re-initialized
    document.getElementById('prevMonth').onclick = () => {
        currentDate.setDate(1); // Fixes Jan 31 -> Mar bug
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    };

    document.getElementById('nextMonth').onclick = () => {
        currentDate.setDate(1);
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    };

    // Modal Events
    setupModal();
}

function renderCalendarHeaders() {
    const grid = document.getElementById('calendarGrid');
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'weekday-header';
        div.innerText = day;
        grid.appendChild(div);
    });
}

function renderCalendar(date) {
    const grid = document.getElementById('calendarGrid');
    const display = document.getElementById('currentMonthDisplay');

    // Clear previous days
    grid.innerHTML = '';
    renderCalendarHeaders();

    const year = date.getFullYear();
    const month = date.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    display.innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    // Today for comparison (strip time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Padding for days before the 1st
    for (let i = 0; i < startingDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty-slot';
        grid.appendChild(empty);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.innerText = i;

        // Format date string YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dayDiv.dataset.date = dateStr;

        // Date object for logic
        const cellDate = new Date(year, month, i);

        // Logic Hierarchy:
        // 1. Booked (Red) - takes precedence
        // 2. Past (Gray)
        // 3. Available (Green)
        if (bookingsMap[dateStr]) {
            dayDiv.classList.add('booked');
            dayDiv.title = `Booked by ${bookingsMap[dateStr]}`;
            dayDiv.onclick = () => alert(`This date is booked by: ${bookingsMap[dateStr]}`);
        } else if (cellDate < today) {
            dayDiv.classList.add('past');
            dayDiv.title = "Past Date";
        } else {
            dayDiv.classList.add('available');
            dayDiv.onclick = () => openBookingModal(dateStr);
        }

        grid.appendChild(dayDiv);
    }
}

/* ===========================
   API Integration Logic
   =========================== */
async function fetchBookedDates(silent = false) {
    try {
        if (!silent) console.log("Fetching full booking details...");
        const response = await fetch(API_URL + '?action=get_bookings');
        const data = await response.json();

        if (data.success && data.bookings) {
            // Save to cache
            localStorage.setItem('bookingData', JSON.stringify(data.bookings));
            processBookingData(data.bookings);
        }
    } catch (error) {
        console.error("Error fetching bookings:", error);
    }
}

function processBookingData(bookings) {
    bookingsMap = {}; // Reset
    bookedDates = [];

    bookings.forEach(b => {
        const dateKey = b.booked_date || b.date;
        const name = b.full_name || b.name || "Unknown";
        if (dateKey) {
            const d = new Date(dateKey).toISOString().split('T')[0];
            bookedDates.push(d);
            bookingsMap[d] = name;
        }
    });
}

function setupModal() {
    const modal = document.getElementById('bookingModal');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('bookingForm');

    closeBtn.onclick = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = "none", 300);
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = "none", 300);
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        await submitBooking();
    };
}

function openBookingModal(dateStr) {
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingDate').value = dateStr;
    modal.style.display = "flex";
    // Trigger reflow
    void modal.offsetWidth;
    modal.classList.add('show');
}

function showBookedDetails(dateStr) {
    alert(`This date (${dateStr}) is already booked!`);
}

async function submitBooking() {
    const btn = document.querySelector('#bookingForm button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    // Payload matching Google Apps Script doPost keys
    const data = {
        action: 'book',
        booked_date: document.getElementById('bookingDate').value,
        full_name: document.getElementById('fullName').value,
        mo_number: "'" + document.getElementById('mobile').value, // Add quote for sheet string format if desired
        location: document.getElementById('location').value
    };

    try {
        // Send as POST JSON
        // Note: Google Apps Script Web App must be deployed as "Anyone" for this to work without CORS issues
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(data)
        });

        // Try to parse JSON. If CORS opaque, this might fail or return empty.
        // If script is correct, it returns JSON.
        const result = await response.json();

        if (result.success) {
            showThankYouModal(data.full_name, 'Wedding Hall');

            // Optimistic update
            bookedDates.push(data.booked_date);
            if (data.booked_date) bookingsMap[data.booked_date] = data.full_name || "You";

            // Re-render
            renderCalendar(currentDate);

            // Close modal
            document.getElementById('bookingModal').classList.remove('show');
            setTimeout(() => document.getElementById('bookingModal').style.display = "none", 300);
            document.getElementById('bookingForm').reset();
        } else {
            alert("Booking failed: " + (result.message || "Unknown error"));
        }

    } catch (error) {
        console.error("Booking Error:", error);
        // Fallback: If network error or CORS opaque response that prohibits reading
        // but the request was actually sent.
        alert("Booking request sent! Note: If you don't see the date red immediately, please refresh.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showToast(message) {
    const x = document.getElementById("toast");
    if (!x) return;
    x.innerText = message;
    x.style.visibility = "visible";
    setTimeout(function () { x.style.visibility = "hidden"; }, 3000);
}

/* ===========================
   Thank You Modal Logic
   =========================== */
function showThankYouModal(name, type) {
    const modal = document.getElementById('thankYouModal');
    const msgElement = document.getElementById('thankYouMessage');

    // Customize message based on type
    if (type === 'Hotel Room') {
        msgElement.innerHTML = `Dear <strong>${name}</strong>,<br>Thank you for booking a room at AKS International Hotel. We have received your request and will confirm your stay shortly.`;
    } else {
        msgElement.innerHTML = `Dear <strong>${name}</strong>,<br>Thank you for choosing AKS International Hotel for your special event. We have received your booking request for the Wedding Hall.`;
    }

    modal.style.display = "flex";
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeThankYouModal() {
    const modal = document.getElementById('thankYouModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = "none", 300);
}

/* ===========================
   Mobile Bottom Menu Logic
   =========================== */
/* ===========================
   Mobile Bottom Menu Logic
   =========================== */
/* ===========================
   Mobile Bottom Menu Logic (Sliding)
   =========================== */
function initMobileMenu() {
    console.log("Initializing Mobile Menu...");
    const navContainer = document.getElementById('mobileBottomNav');
    const toggleBtn = document.getElementById('mobileNavToggleBtn');

    if (!navContainer || !toggleBtn) {
        console.error("Mobile Menu Elements Not Found!", { navContainer, toggleBtn });
        return;
    }

    function toggleMenu(e) {
        e.preventDefault(); // Prevent default button behavior
        e.stopPropagation();

        console.log("Menu Toggle Clicked");

        // Toggle class on the main container
        const isActive = navContainer.classList.contains('slide-active');

        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        console.log("Opening Menu");
        navContainer.classList.add('slide-active');
        toggleBtn.innerHTML = '&times;'; // Change to X
        toggleBtn.classList.add('active');
    }

    function closeMenu() {
        console.log("Closing Menu");
        navContainer.classList.remove('slide-active');
        toggleBtn.innerHTML = '&#9776;'; // Change to Hamburger
        toggleBtn.classList.remove('active');
    }

    // Remove existing listeners if any (though typically not needed if plain function)
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);

    newBtn.addEventListener('click', toggleMenu);

    // Close on link click (inside the nav-links)
    const links = navContainer.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (navContainer.classList.contains('slide-active') && !navContainer.contains(e.target)) {
            closeMenu();
        }
    });
}
function initAdmin() {
    const loginContainer = document.getElementById('loginContainer');
    const adminDashboard = document.getElementById('adminDashboard');
    const userDashboard = document.getElementById('userDashboard');

    // Check Admin Session
    if (localStorage.getItem('isAdmin') === 'true') {
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAdminData();
    }
    // We don't persist User Session for simplicity/security in this static demo, 
    // We don't persist User Session for simplicity/security in this static demo,
    // forcing re-login each time for "Check Status".

    // Admin Login Logic
    const adminForm = document.getElementById('adminLoginForm');
    if (adminForm) {
        // 1. Admin Login Logic (Secure - No Persistence)
        let isAdminLoggedIn = false; // In-memory session only

        async function handleAdminLogin(e) {
            e.preventDefault();
            const userIdInput = document.getElementById('adminUsername');
            const passwordInput = document.getElementById('adminPassword');
            const loginBtn = document.getElementById('adminLoginBtn');
            const loginMessage = document.getElementById('adminLoginMessage');

            const userId = userIdInput.value.trim();
            const password = passwordInput.value.trim();

            if (!userId || !password) {
                loginMessage.style.color = 'red';
                loginMessage.innerText = 'Please enter both User ID and Password';
                return;
            }

            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerText = 'Verifying...';
            }
            if (loginMessage) loginMessage.innerText = '';

            try {
                const response = await fetch(`${API_URL}?action=admin_login&user_id=${encodeURIComponent(userId)}&password=${encodeURIComponent(password)}`);
                const data = await response.json();

                if (data.success) {
                    // Login Success
                    isAdminLoggedIn = true;

                    // Clear inputs for security
                    userIdInput.value = '';
                    passwordInput.value = '';

                    // UI Switch
                    document.getElementById('adminLoginSection').style.display = 'none';
                    document.getElementById('adminDashboard').style.display = 'block';

                    // Fetch Dashboard Data
                    loadAdminData(); // Changed from loadAdminDashboard to loadAdminData to match existing function name
                } else {
                    // Login Failed
                    loginMessage.style.color = 'red';
                    loginMessage.innerText = 'Invalid Credentials';
                }

            } catch (error) {
                console.error("Login Error:", error);
                loginMessage.style.color = 'red';
                loginMessage.innerText = 'Network Error. Please try again.';
            } finally {
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerText = 'Login';
                }
            }
        }
        adminForm.onsubmit = handleAdminLogin; // Assign the new handler
    }

    // Admin Logout Logic (Restored)
    const adminLogoutBtn = document.getElementById('logoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.onclick = () => {
            isAdminLoggedIn = false;
            window.location.reload(); // Reloads page, clearing in-memory state
        };
    }

    // User Login Logic
    const userForm = document.getElementById('userLoginForm');
    if (userForm) {
        userForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('userLoginName').value.trim();
            const mobile = document.getElementById('userLoginMobile').value.trim();

            const btn = userForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Checking...";
            btn.disabled = true;

            try {
                // Fetch BOTH Banquet and Hotel bookings
                const [banquetRes, hotelRes] = await Promise.all([
                    fetch(API_URL + '?action=get_bookings'),
                    fetch(API_URL + '?action=get_room_bookings')
                ]);

                const banquetData = await banquetRes.json();
                const hotelData = await hotelRes.json();

                let allBookings = [];

                // Process Banquet Data
                if (banquetData.success && banquetData.bookings) {
                    banquetData.bookings.forEach(b => b.type = 'Banquet');
                    allBookings = allBookings.concat(banquetData.bookings);
                }

                // Process Hotel Data
                if (hotelData.success && hotelData.bookings) {
                    hotelData.bookings.forEach(b => b.type = 'Hotel');
                    allBookings = allBookings.concat(hotelData.bookings);
                }

                // Filter logic
                const myBookings = allBookings.filter(b => {
                    // Loose matching
                    // Banquet uses mo_number, Hotel uses mobile
                    const rawMobile = b.mo_number || b.mobile || '';
                    const bMobile = rawMobile.toString().replace(/'/g, '').trim();

                    const bName = (b.full_name || b.name || '').toLowerCase();
                    return bMobile === mobile && bName.includes(name.toLowerCase());
                });

                if (myBookings.length > 0) {
                    showUserDashboard(myBookings);
                } else {
                    alert('No bookings found with these details.');
                }

            } catch (err) {
                console.error(err);
                alert('Error fetching records.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }

    const userLogoutBtn = document.getElementById('userLogoutBtn'); // User
    if (userLogoutBtn) {
        userLogoutBtn.onclick = () => {
            // No local storage for user to clear, just reload
            window.location.reload();
        };
    }
}

function showUserDashboard(bookings) {
    document.getElementById('loginContainer').style.display = 'none';
    const dash = document.getElementById('userDashboard');
    const results = document.getElementById('userBookingResults');
    dash.style.display = 'block';

    results.innerHTML = bookings.map(b => {
        const isConfirmed = (b.status && b.status.toLowerCase() === 'confirmed');
        const statusColor = isConfirmed ? '#2ecc71' : 'var(--primary-color)'; // Green or Gold
        const badgeBg = isConfirmed ? '#e6fffa' : '#fff3cd';
        const badgeColor = isConfirmed ? '#00bfa5' : '#856404';

        // Hotel Booking Card
        if (b.type === 'Hotel') {
            return `
            <div style="background: white; padding: 20px; border-radius: 12px; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                    <div>
                        <h3 style="color: var(--secondary-color); margin: 0;">Hotel Stay</h3>
                        <small style="color: #666;">${b.room_type} Room</small>
                    </div>
                    <span style="padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; background: ${badgeBg}; color: ${badgeColor};">
                        ${b.status || 'Pending'}
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95rem;">
                    <p><strong>Name:</strong> ${b.full_name}</p>
                    <p><strong>Price:</strong> ₹${b.price}</p>
                    
                    <p><strong>Check-In:</strong> <br>${b.check_in}</p>
                    <p><strong>Check-Out:</strong> <br>${b.check_out}</p>
                    
                    <p><strong>Guests:</strong> ${b.adults} Adults, ${b.children} Child</p>
                    <p><strong>Rooms:</strong> ${b.no_of_rooms}</p>

                    <p style="grid-column: span 2;"><strong>Payment Method:</strong> ${b.payment_method || 'N/A'}</p>
                </div>
                
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #eee; font-size: 0.9rem; color: #555;">
                   Status: <strong>${isConfirmed ? "Confirmed (Payment Done)" : "Pending Approval"}</strong>
                </div>
            </div>
            `;
        }

        // Banquet Booking Card (Existing Style)
        else {
            return `
            <div style="background: white; padding: 20px; border-radius: 12px; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3 style="color: var(--secondary-color); margin-bottom: 10px;">Wedding / Banquet</h3>
                    <span style="padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; 
                        background: ${badgeBg}; color: ${badgeColor};">
                        ${b.status || 'Pending'}
                    </span>
                </div>
                <p><strong>Date:</strong> ${b.booked_date}</p>
                <p><strong>Name:</strong> ${b.full_name}</p>
                <p><strong>Location:</strong> ${b.location}</p>
                <p><strong>Mobile:</strong> ${b.mo_number}</p>
                <p><strong>Payment:</strong> <span style="font-weight: 600; color: ${b.payment_status === 'Paid' ? 'green' : 'orange'}">${b.payment_status || 'Pending'}</span></p>
            </div>
            `;
        }
    }).join('');
}


let currentAdminTab = 'wedding';


function switchAdminTab(type) {
    currentAdminTab = type;
    const btnWedding = document.getElementById('btnAdminWedding');
    const btnHotel = document.getElementById('btnAdminHotel');
    const btnPrice = document.getElementById('btnAdminPrice');

    // Reset all buttons
    [btnWedding, btnHotel, btnPrice].forEach(btn => {
        if (btn) {
            btn.className = 'btn-modern-outline';
            btn.style.background = 'white';
            btn.style.color = '#000000';
        }
    });

    // Hide all sections
    const tableContainer = document.querySelector('.dashboard-container > div:nth-child(3)'); // The table container
    const priceSection = document.getElementById('setPriceSection');

    if (tableContainer) tableContainer.style.display = 'none';
    if (priceSection) priceSection.style.display = 'none';

    // Activate selected
    if (type === 'wedding') {
        if (btnWedding) {
            btnWedding.className = 'btn-modern';
            btnWedding.style.background = '';
            btnWedding.style.color = '';
        }
        if (tableContainer) tableContainer.style.display = 'block';
        loadAdminData('wedding'); // Explicitly pass type
    } else if (type === 'hotel') {
        if (btnHotel) {
            btnHotel.className = 'btn-modern';
            btnHotel.style.background = '';
            btnHotel.style.color = '';
        }
        if (tableContainer) tableContainer.style.display = 'block';
        loadAdminData('hotel'); // Explicitly pass type
    } else if (type === 'price') {
        if (btnPrice) {
            btnPrice.className = 'btn-modern';
            btnPrice.style.background = '';
            btnPrice.style.color = '';
        }
        if (priceSection) {
            priceSection.style.display = 'block';
            fetchPriceSettings();
        }
    }
}

async function loadAdminData(type = 'wedding') {
    const tbody = document.getElementById('bookingTableBody');
    const thead = document.getElementById('adminTableHead');

    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading data...</td></tr>';

    try {
        let action = type === 'wedding' ? 'get_bookings' : 'get_room_bookings';
        const response = await fetch(API_URL + '?action=' + action);
        const data = await response.json();

        let bookings = [];
        if (data.success && data.bookings) {
            bookings = data.bookings;
        }

        // Update Headers based on Type
        if (type === 'wedding') {
            thead.innerHTML = `
                <tr>
                    <th>Booked Date</th>
                    <th>Customer Name</th>
                    <th>Mobile</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Notes</th>
                </tr>`;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>Timestamp</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Customer Name</th>
                    <th>Room Type</th>
                    <th>No. Rooms</th>
                    <th>Mobile</th>
                    <th>Status</th>
                </tr>`;
        }

        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found.</td></tr>';
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');

            if (type === 'wedding') {
                // Sort by date descending
                bookings.sort((a, b) => new Date(b.booked_date) - new Date(a.booked_date));

                // Payment Button Logic
                const isPaid = b.payment_status === 'Paid';
                const payBtn = `<button onclick="updateBooking(this, '${b.booked_date}', {payment_status: '${isPaid ? 'Pending' : 'Paid'}'})" 
                    class="btn-sm" style="background: ${isPaid ? '#2ecc71' : '#f1c40f'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    ${isPaid ? 'Paid' : 'Mark Paid'}
                </button>`;

                // Status Button Logic
                const isConfirmed = b.status === 'Confirmed';
                const statusBtn = `<button onclick="updateBooking(this, '${b.booked_date}', {status: '${isConfirmed ? 'Pending' : 'Confirmed'}'})" 
                    class="btn-sm" style="background: ${isConfirmed ? '#2ecc71' : '#95a5a6'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    ${isConfirmed ? 'Confirmed' : 'Confirm'}
                </button>`;

                const notesInput = `
                    <div style="display: flex; gap: 5px;">
                        <textarea id="note-${b.booked_date}" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; resize: none;" rows="2">${b.admin_notes || ''}</textarea>
                        <button onclick="saveNote('${b.booked_date}')" style="border: none; background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer; padding: 0 8px;">Save</button>
                    </div>
                `;

                tr.innerHTML = `
                    <td>${b.booked_date || 'N/A'}</td>
                    <td>
                        <div>${b.full_name || '-'}</div>
                        <small style="color: #666;">${b.location || '-'}</small>
                    </td>
                    <td>${b.mo_number || '-'}</td>
                    <td>${payBtn}</td>
                    <td>${statusBtn}</td>
                    <td style="min-width: 200px;">${notesInput}</td>
                `;
            } else {
                // Hotel Logic
                // Sort by check-in descending
                bookings.sort((a, b) => new Date(b.check_in) - new Date(a.check_in));

                // Status Button Logic for Rooms
                const isConfirmed = b.status === 'Confirmed';
                const statusBtn = `<button onclick="updateRoomStatus(this, '${b.timestamp}', '${isConfirmed ? 'Pending' : 'Confirmed'}')" 
                    class="btn-sm" style="background: ${isConfirmed ? '#2ecc71' : '#f1c40f'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    ${isConfirmed ? 'Confirmed' : 'Pending'}
                </button>`;

                let timestampStr = '-';
                try {
                    if (b.timestamp) timestampStr = new Date(b.timestamp).toLocaleString();
                } catch (e) { }

                tr.innerHTML = `
                    <td><small style="font-size: 0.8rem; color: #555;">${timestampStr}</small></td>
                    <td>${b.check_in || '-'}</td>
                    <td>${b.check_out || '-'}</td>
                    <td>
                        <div style="font-weight:600">${b.full_name || '-'}</div>
                        <small>Paid via: ${b.payment_method || '-'}</small>
                    </td>
                    <td>
                        ${b.room_type || '-'}<br>
                        <small style="color:green; font-weight:bold;">₹${b.price || 'N/A'}</small><br>
                        <small style="color:#666; font-size:0.8em;">A: ${b.adults}, C: ${b.children}</small>
                    </td>
                    <td>${b.no_of_rooms || '1'}</td>
                    <td>${b.mobile || '-'}</td>
                    <td>
                        ${statusBtn}
                    </td>
                `;
            }
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8">Error loading data: ${e.message}</td></tr>`;
    }
}

async function updateRoomStatus(btn, timestamp, newStatus) {
    const originalText = btn.innerText;
    const originalColor = btn.style.background;

    // Loading State
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">↻</span>';
    btn.style.opacity = "0.7";

    const payload = {
        action: 'update_room_booking',
        timestamp: timestamp,
        status: newStatus
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Room Updated');

            // Optimistic Update
            btn.disabled = false;
            btn.style.opacity = "1";

            const isConfirmed = newStatus === 'Confirmed';
            btn.innerText = isConfirmed ? 'Confirmed' : 'Confirm';
            btn.style.background = isConfirmed ? '#2ecc71' : '#95a5a6';

            // Update onclick for next toggle
            btn.setAttribute('onclick', `updateRoomStatus(this, '${timestamp}', '${isConfirmed ? 'Pending' : 'Confirmed'}')`);

        } else {
            // Enhanced error feedback
            alert('Update failed: ' + res.message); // Alert instead of toast for visibility
            showToast('Update failed: ' + res.message);
            btn.innerHTML = originalText;
            btn.style.background = originalColor;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        showToast('Error connecting to server');
        btn.innerHTML = originalText;
        btn.style.background = originalColor;
        btn.disabled = false;
    }
}

async function updateBooking(btn, date, updates) {
    // btn is the button element
    const originalText = btn.innerText;
    const originalColor = btn.style.background;

    // Loading State
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">↻</span>';
    btn.style.opacity = "0.7";

    const payload = {
        action: 'update_booking',
        booked_date: date,
        ...updates
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Updated successfully');

            // Optimistic Update (No Full Reload)
            btn.disabled = false;
            btn.style.opacity = "1";

            // Determine new state based on updates
            if (updates.payment_status) {
                const isPaid = updates.payment_status === 'Paid';
                btn.innerText = isPaid ? 'Paid' : 'Mark Paid';
                btn.style.background = isPaid ? '#2ecc71' : '#f1c40f';
                // Toggle next action
                btn.setAttribute('onclick', `updateBooking(this, '${date}', {payment_status: '${isPaid ? 'Pending' : 'Paid'}'})`);
            } else if (updates.status) {
                const isConf = updates.status === 'Confirmed';
                btn.innerText = isConf ? 'Confirmed' : 'Confirm';
                btn.style.background = isConf ? '#2ecc71' : '#95a5a6';
                btn.setAttribute('onclick', `updateBooking(this, '${date}', {status: '${isConf ? 'Pending' : 'Confirmed'}'})`);
            } else if (updates.admin_notes) {
                // Notes usually come from separate save button, handled by safeNote which might not pass 'this' correctly yet
                // But saveNote calls updateBooking with button? No, let's check saveNote
            }

        } else {
            showToast('Update failed: ' + res.message);
            // Revert
            btn.innerHTML = originalText;
            btn.style.background = originalColor;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        showToast('Error connecting to server');
        btn.innerHTML = originalText;
        btn.style.background = originalColor;
        btn.disabled = false;
    }
}

async function saveNote(date) {
    const noteVal = document.getElementById(`note-${date}`).value;
    const btn = event.target; // Implicit event target from onclick
    await updateBooking(btn, date, { admin_notes: noteVal });
    // Restore text for Save button
    btn.innerText = "Save";
}

// Gallery Filter Logic
function filterGallery(category) {
    // 1. Update Buttons
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.innerText.trim().toLowerCase() === category.toLowerCase() || (category === 'all' && btn.innerText.trim() === 'All')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Filter Images
    const items = document.querySelectorAll('.gallery-item');
    const classFilter = 'category-' + category.toLowerCase().replace(/\s+/g, '-');

    items.forEach(item => {
        if (category === 'all') {
            item.style.display = 'block';
            setTimeout(() => item.style.opacity = '1', 50);
        } else {
            if (item.classList.contains(classFilter)) {
                item.style.display = 'block';
                setTimeout(() => item.style.opacity = '1', 50);
            } else {
                item.style.opacity = '0';
                setTimeout(() => item.style.display = 'none', 300);
            }
        }
    });
}

/* ===========================
   Gallery Lightbox Logic
   =========================== */
function initGalleryLightbox() {
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const closeBtn = document.querySelector('.lightbox-close');

    if (!lightbox || !lightboxImg) return;

    // Open Lightbox
    document.querySelectorAll('.gallery-item img').forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightbox.style.display = 'flex';
            setTimeout(() => lightbox.classList.add('show'), 10);
        });
    });

    // Close Lightbox
    function closeLightbox() {
        lightbox.classList.remove('show');
        setTimeout(() => lightbox.style.display = 'none', 300);
        lightboxImg.src = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    // Close on background click
    lightbox.addEventListener('click', (e) => {
        // e.target === lightbox checks if we clicked the container, not the image
        if (e.target === lightbox || e.target.classList.contains('lightbox-content') === false && e.target !== lightboxImg) {
            closeLightbox();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.style.display === 'flex') {
            closeLightbox();
        }
    });
}

// Initialize Lightbox on Load
document.addEventListener('DOMContentLoaded', initGalleryLightbox);

/* ===========================
   Quick View Slider Logic
   =========================== */
function initQuickViewSlider() {
    const sliderWrapper = document.getElementById('quickViewSlider');
    if (!sliderWrapper) return;

    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    const dotsContainer = document.getElementById('sliderDots');
    let currentIndex = 0;
    const totalSlides = slides.length;
    let slideInterval;

    // Create Dots
    if (dotsContainer) {
        dotsContainer.innerHTML = ''; // Clear existing
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    const dots = document.querySelectorAll('.dot');

    function updateSlider() {
        // Use clientWidth of the container for precise pixel-based shifting
        const width = sliderWrapper.parentElement.clientWidth;
        sliderWrapper.style.transform = `translateX(-${currentIndex * width}px)`;

        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    function goToSlide(index) {
        currentIndex = index;
        if (currentIndex < 0) currentIndex = totalSlides - 1;
        if (currentIndex >= totalSlides) currentIndex = 0;
        updateSlider();
        resetTimer();
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    function resetTimer() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 10000);
    }

    // Recalculate on resize to fix pixel offsets
    window.addEventListener('resize', updateSlider);

    // Event Listeners
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    // Filter swipes for mobile (basic support)
    let touchStartX = 0;
    let touchEndX = 0;

    sliderWrapper.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    sliderWrapper.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        if (touchStartX - touchEndX > 50) nextSlide();
        if (touchEndX - touchStartX > 50) prevSlide();
    }

    // Auto Slide
    resetTimer();
}

/* ===========================
   Reviews Logic
   =========================== */
let currentReviewSlide = 0;
let totalReviews = 0;

function initReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;

    fetchReviews();
    setupReviewModal();
}

async function fetchReviews() {
    const container = document.getElementById('reviewsContainer');
    try {
        console.log("Fetching reviews...");
        container.innerHTML = '<div class="text-center" style="width:100%; padding:20px;">Loading reviews...</div>';

        // Cache busting with timestamp
        const response = await fetch(API_URL + '?action=get_reviews&_t=' + new Date().getTime());
        const data = await response.json();
        console.log("Reviews Data:", data);

        if (data.success) {
            if (data.reviews && data.reviews.length > 0) {
                renderReviews(data.reviews);
            } else {
                container.innerHTML = '<div class="text-center" style="width:100%; padding:20px;">No reviews yet. Be the first to share your experience!</div>';
            }
        } else {
            throw new Error(data.message || "Unknown error");
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        container.innerHTML = `
            <div class="text-center" style="width:100%; color:red; padding: 20px;">
                <p>Failed to load reviews.</p>
                <button class="btn btn-sm btn-outline-dark" onclick="fetchReviews()">Retry</button>
            </div>`;
    }
}

function renderReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '';
    totalReviews = reviews.length;
    currentReviewSlide = 0; // Reset

    reviews.forEach(r => {
        // Generate Stars
        let ratingVal = parseInt(r.rating) || 5;
        let stars = '';
        for (let i = 0; i < 5; i++) {
            stars += i < ratingVal ? '★' : '☆';
        }

        // Format Date safely
        let d = "Recent";
        try {
            if (r.date) {
                const dateObj = new Date(r.date);
                if (!isNaN(dateObj.getTime())) {
                    d = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                }
            }
        } catch (e) { console.warn("Date parse error", e); }

        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-rating">${stars}</div>
            <p class="review-text">"${r.review || ''}"</p>
            <div class="reviewer-name">${r.name || 'Guest'}</div>
            <div class="review-date">${d}</div>
        `;
        container.appendChild(card);
    });

    // Force strict reflow
    void container.offsetWidth;
    updateReviewSlider();
}

function updateReviewSlider() {
    const container = document.getElementById('reviewsContainer');
    const cards = document.querySelectorAll('.review-card');
    if (cards.length === 0) return;

    // Calculate width to shift
    const cardWidth = cards[0].offsetWidth; // includes padding/border if border-box
    const gap = 20;
    const moveAmount = (cardWidth + gap) * currentReviewSlide;

    container.style.transform = `translateX(-${moveAmount}px)`;
}

function slideReviews(direction) {
    const isDesktop = window.innerWidth >= 768;
    const visibleCount = isDesktop ? 3 : 1;

    const maxIndex = Math.max(0, totalReviews - visibleCount);

    currentReviewSlide += direction;

    if (currentReviewSlide < 0) currentReviewSlide = 0;
    if (currentReviewSlide > maxIndex) currentReviewSlide = maxIndex; // Stop at end

    updateReviewSlider();
}

// Listen for resize to adjust slider
window.addEventListener('resize', () => {
    slideReviews(0); // Recalc clamp
    updateReviewSlider();
});


/* Review Modal Logic */
function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    // Reset state
    document.getElementById('reviewStep1').style.display = 'block';
    document.getElementById('reviewStep2').style.display = 'none';
    document.getElementById('reviewVerifyForm').reset();
    document.getElementById('reviewSubmitForm').reset();

    modal.style.display = "flex";
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = "none", 300);
}

function setupReviewModal() {
    // Step 1: Verify
    const verifyForm = document.getElementById('reviewVerifyForm');
    if (verifyForm) {
        verifyForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = verifyForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Verifying...";
            btn.disabled = true;

            const mobileInput = document.getElementById('reviewMobile').value.trim();

            try {
                // Check against bookings (API get all)
                // Fetch both Banquet and Hotel bookings
                const [banquetRes, hotelRes] = await Promise.all([
                    fetch(API_URL + '?action=get_bookings'),
                    fetch(API_URL + '?action=get_room_bookings')
                ]);

                const banquetData = await banquetRes.json();
                const hotelData = await hotelRes.json();

                let foundUser = null;

                // 1. Check Banquet
                if (banquetData.success && banquetData.bookings) {
                    foundUser = banquetData.bookings.find(b => {
                        const bMobile = (b.mo_number || '').toString().replace(/'/g, '').trim();
                        const isConfirmed = (b.status === 'Confirmed' || b.status === 'Booked');
                        const isPaid = (b.payment_status === 'Paid' || b.payment_status === 'Done');
                        return bMobile === mobileInput && isConfirmed && isPaid;
                    });
                }

                // 2. Check Hotel (if not found)
                if (!foundUser && hotelData.success && hotelData.bookings) {
                    foundUser = hotelData.bookings.find(b => {
                        const bMobile = (b.mobile || '').toString().replace(/'/g, '').trim();
                        const isConfirmed = (b.status && b.status.toLowerCase() === 'confirmed');
                        // Hotel might not have strict 'Payment' column check in object, relying on Status='Confirmed'
                        return bMobile === mobileInput && isConfirmed;
                    });
                }

                if (foundUser) {
                    // Success
                    document.getElementById('reviewStep1').style.display = 'none';
                    document.getElementById('reviewStep2').style.display = 'block';
                    document.getElementById('reviewerNameDisplay').innerText = foundUser.full_name;
                } else {
                    alert("No confirmed booking found for this mobile number.");
                }
            } catch (err) {
                console.error(err);
                alert("Verification failed. Please try again.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }

    // Step 2: Submit
    const submitForm = document.getElementById('reviewSubmitForm');
    if (submitForm) {
        submitForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = submitForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Submitting...";
            btn.disabled = true;

            const reviewText = document.getElementById('reviewText').value;
            const mobile = document.getElementById('reviewMobile').value.trim();
            const ratingSelector = document.querySelector('input[name="rating"]:checked');
            const rating = ratingSelector ? ratingSelector.value : 5;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'add_review',
                        mobile: mobile,
                        review: reviewText,
                        rating: rating
                    })
                });
                const result = await response.json();

                if (result.success) {
                    showToast("Review Submitted! Thank you.");
                    closeReviewModal();
                    fetchReviews(); // Refresh list
                } else {
                    alert(result.message || "Submission failed.");
                }
            } catch (err) {
                console.error(err);
                alert("Error submitting review.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }
}



/* ===========================
   Room Selection Logic
   =========================== */
/* ===========================
   Room Selection Logic (Simplified)
   =========================== */

window.selectRoom = function (roomType) {
    // Determine number of guests based on room type defaults
    let defaultAdults = 2;
    let defaultChildren = 0;

    // Show form
    const form = document.getElementById('hotelBookingForm');
    if (form) {
        form.style.display = 'block';

        // Set hidden input and trigger change for price calc
        const roomTypeInput = document.getElementById('roomType');
        if (roomTypeInput) {
            roomTypeInput.value = roomType;
            // Native dispatch Event
            roomTypeInput.dispatchEvent(new Event('change'));
        }

        // Reset validatity
        document.getElementById('hotelBookingForm').reset();

        // Re-set room type after reset
        if (roomTypeInput) roomTypeInput.value = roomType;

        form.scrollIntoView({ behavior: 'smooth' });

    } else {
        console.error("Hotel booking form not found");
    }
};



/* ===========================
   Admin: Set Price Logic
   =========================== */
function fetchPriceSettings() {
    console.log("Fetching admin price settings...");

    fetch(API_URL + "?action=get_price_data")
        .then(res => res.json())
        .then(result => {
            if (result.success && result.data) {
                document.getElementById('adminDeluxePrice').value = result.data.deluxePrice || '';
                document.getElementById('adminDeluxeOffer').value = result.data.deluxeOffer || '';
                document.getElementById('adminDeluxeExtraAdult').value = result.data.deluxeExtraAdult || '';
                document.getElementById('adminDeluxeChild').value = result.data.deluxeChild || '';

                document.getElementById('adminSuitePrice').value = result.data.suitePrice || '';
                document.getElementById('adminSuiteOffer').value = result.data.suiteOffer || '';
                document.getElementById('adminSuiteExtraAdult').value = result.data.suiteExtraAdult || '';
                document.getElementById('adminSuiteChild').value = result.data.suiteChild || '';
            }
        })
        .catch(err => console.error("Error fetching prices:", err));
}

document.addEventListener('DOMContentLoaded', () => {
    const priceForm = document.getElementById('setPriceForm');
    if (priceForm) {
        priceForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = priceForm.querySelector('button');
            const msg = document.getElementById('priceUpdateMsg');

            const originalText = btn.innerText;
            btn.innerText = "Updating...";
            btn.disabled = true;
            msg.innerText = "";

            const data = {
                action: 'update_price_data',
                deluxePrice: document.getElementById('adminDeluxePrice').value,
                deluxeOffer: document.getElementById('adminDeluxeOffer').value,
                deluxeExtraAdult: document.getElementById('adminDeluxeExtraAdult').value,
                deluxeChild: document.getElementById('adminDeluxeChild').value,

                suitePrice: document.getElementById('adminSuitePrice').value,
                suiteOffer: document.getElementById('adminSuiteOffer').value,
                suiteExtraAdult: document.getElementById('adminSuiteExtraAdult').value,
                suiteChild: document.getElementById('adminSuiteChild').value
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success) {
                    msg.style.color = "green";
                    msg.innerText = "Prices updated successfully!";
                    // Update global config immediately for smooth experience
                    roomPricingConfig.deluxe.price = parseInt(data.deluxePrice) || 1690;
                    roomPricingConfig.deluxe.extraAdult = parseInt(data.deluxeExtraAdult) || 500;
                    roomPricingConfig.deluxe.child = parseInt(data.deluxeChild) || 300;

                    roomPricingConfig.suite.price = parseInt(data.suitePrice) || 2190;
                    roomPricingConfig.suite.extraAdult = parseInt(data.suiteExtraAdult) || 700;
                    roomPricingConfig.suite.child = parseInt(data.suiteChild) || 400;

                    // Also update public display if on same page (SPA feel)
                    const dPrice = document.getElementById('deluxePriceDisplay');
                    const sPrice = document.getElementById('suitePriceDisplay');
                    if (dPrice) dPrice.innerText = data.deluxePrice;
                    if (sPrice) sPrice.innerText = data.suitePrice;

                } else {
                    msg.style.color = "red";
                    msg.innerText = "Update failed: " + result.message;
                }
            } catch (error) {
                console.error("Update Error:", error);
                msg.style.color = "red";
                msg.innerText = "Network Error";
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }
});

/* ===========================
   Room Gallery Logic (Restored)
   =========================== */

const roomGalleryData = {
    'Deluxe': [
        { src: "https://lh3.googleusercontent.com/d/11l2b-SVJxYxelz7xE8jDZvFMfsm5z3_n", caption: "Deluxe Room - Main View" },
        { src: "https://lh3.googleusercontent.com/d/1yEyoCvlsLCYQeL55GBrP56C0lvp0m8Es", caption: "Deluxe Room - Interior" },
        { src: "https://lh3.googleusercontent.com/d/1m5WjJeCrNqn0FFZormOzYfnTf83FlHEA", caption: "Deluxe Room - Seating Area" },
        { src: "https://lh3.googleusercontent.com/d/15kL9VoJBBPKgpLOpbE-lGizyZUeNERAr", caption: "Deluxe Room - Bed View" }
    ],
    'Suite': [
        { src: "https://lh3.googleusercontent.com/d/11XAdg5nO484VYZp1ZO6lbURGwyCfAtw5", caption: "Executive Suite - Main View" },
        { src: "https://lh3.googleusercontent.com/d/1CUSoQf__bj-omxYNS_GUWPAJQCmr26fs", caption: "Executive Suite - Spacious Living" },
        { src: "https://lh3.googleusercontent.com/d/1NYKrYNb7n34Rdsbsx-T9kELI74_fgEe4", caption: "Executive Suite - Bedroom" },
        { src: "https://lh3.googleusercontent.com/d/1BDFhHLMisSTbMWbf_9AafGo_69YQgHvR", caption: "Executive Suite - Additional View" },
        { src: "https://lh3.googleusercontent.com/d/17kBdymwlXefCNNHAZsdIFvE0_dEf1ZMy", caption: "Executive Suite - Full Room" }
    ]
};

let currentRoomGalleryType = 'Deluxe';
let currentGalleryIndex = 0;

window.openRoomGallery = function (roomType) {
    currentRoomGalleryType = roomType;
    currentGalleryIndex = 0;

    // Fallback if data missing
    if (!roomGalleryData[roomType]) {
        console.error("No gallery data for " + roomType);
        return;
    }

    const modal = document.getElementById('roomGalleryModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex'; // Ensure flex for centering
        showGallerySlide(0);

        // Explicitly handle outside clicks for this modal (safer/more direct than window.onclick)
        modal.onclick = function (e) {
            // Close if clicking ANYWHERE except the image or nav buttons
            if (e.target.id !== 'galleryImage' && !e.target.closest('.gallery-nav')) {
                closeRoomGallery();
            }
        };
    }
};

window.closeRoomGallery = function () {
    const modal = document.getElementById('roomGalleryModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for transition
    }
};

window.changeGallerySlide = function (n) {
    const images = roomGalleryData[currentRoomGalleryType];
    if (!images) return;

    let newIndex = currentGalleryIndex + n;
    if (newIndex >= images.length) newIndex = 0;
    if (newIndex < 0) newIndex = images.length - 1;

    showGallerySlide(newIndex);
};

function showGallerySlide(index) {
    const images = roomGalleryData[currentRoomGalleryType];
    if (!images) return;

    currentGalleryIndex = index;

    const imgElement = document.getElementById('galleryImage');
    const captionElement = document.getElementById('galleryCaption');

    if (imgElement) {
        // Simple fade effect could be added here
        imgElement.style.opacity = 0.5;
        setTimeout(() => {
            imgElement.src = images[index].src;
            imgElement.style.opacity = 1;
        }, 150);
    }

    if (captionElement) {
        captionElement.innerText = images[index].caption;
    }
}

// Close modal when clicking outside content
// Close modal when clicking outside content
// Close modal when clicking outside content
window.onclick = function (event) {
    // Check if the clicked element is a modal (overlay)
    const isModalOverlay = event.target.classList.contains('modal');
    // Check if it's ANY part of the room gallery (we will filter inside)
    const isRoomGallery = event.target.closest('#roomGalleryModal');

    if (isModalOverlay || isRoomGallery) {
        const modal = event.target.closest('.modal') || event.target;
        const modalId = modal.id;

        // Specific handlers
        if (modalId === 'roomGalleryModal') {
            // For gallery, close if clicking ANYWHERE except the image or nav buttons
            if (event.target.id !== 'galleryImage' && !event.target.closest('.gallery-nav')) {
                if (typeof closeRoomGallery === 'function') closeRoomGallery();
            }

        } else if (modalId === 'bookingModal' && isModalOverlay) {
            if (typeof closeBookingModal === 'function') closeBookingModal();
            else modal.style.display = "none";
        } else if (modalId === 'thankYouModal' && isModalOverlay) {
            if (typeof closeThankYouModal === 'function') closeThankYouModal();
            else modal.style.display = "none";
        } else if (modalId === 'reviewModal' && isModalOverlay) {
            if (typeof closeReviewModal === 'function') closeReviewModal();
            else modal.style.display = "none";
        } else if (isModalOverlay) {
            // Generic fallback
            modal.classList.remove('show');
            modal.style.display = "none";
        }
    }
};
