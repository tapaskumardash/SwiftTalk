import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, child, set, get, remove, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "ADD_YOURS",
  authDomain: "ADD_YOURS",
  projectId: "ADD_YOURS",
  storageBucket: "ADD_YOURS",
  messagingSenderId: "ADD_YOURS",
  appId: "ADD_YOURS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase();

// DOM Elements
const offlineArea = document.getElementById("offline-area");
const retryButton = document.getElementById("retry-button");
const optionContainer = document.querySelector(".option-container");
const threeDotIcon = document.querySelector(".bx-dots-vertical-rounded");
const clearChatOption = document.getElementById("clear-chat-option");
const aboutUsOption = document.getElementById("about-app-option");
const contactUsOption = document.getElementById("contact-us-option");
const logoutOption = document.getElementById("logout-option");
const loginArea = document.getElementById("login-area");
const username = document.getElementById("username");
const password = document.getElementById("password");
const usernameErrorMessage = document.getElementById("username-error-message");
const passwordErrorMessage = document.getElementById("password-error-message");
const loginButton = document.getElementById("login-button");
const prompt = document.getElementById("prompt");
const chatArea = document.getElementById("chat-area");
const sendButton = document.getElementById("send");
const incommingMessageTone = new Audio("audios/incomming.mp3");
const outgoingMessageTone = new Audio("audios/outgoing.mp3");
const aboutArea = document.getElementById("about-area");
const contactArea = document.getElementById("contact-area");
const contactName = document.getElementById("contact-name");
const contactEmail = document.getElementById("contact-email");
const contactMessage = document.getElementById("contact-message");
const contactSendButton = document.getElementById("contact-send");
const contactAlertMessage = document.getElementById("contact-area-alert-msg");

let initialMessagesLoaded = false;

// Constants
const SESSION_KEY = "session";
const USER_KEY = "user";
const CHAT_PATH = "ChatApp/Chats";
const USER_PATH = "ChatApp/Users/";
const CONTACT_PATH = "ChatApp/Contact/";

// Internet Connectivity Check
const checkInternet = () => {
  offlineArea.style.display = navigator.onLine ? "none" : "flex";
};

retryButton.addEventListener("click", checkInternet);
setInterval(checkInternet, 5000);

// Option Container Toggle
const toggleOptionContainer = () => {
  optionContainer.classList.toggle("active-option-container");
};

threeDotIcon.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleOptionContainer();
});

document.addEventListener("click", () => {
  optionContainer.classList.remove("active-option-container");
});

// Clear Form
const clearForm = () => {
  username.value = "";
  password.value = "";
};

// Check for Existing Session
const checkForSession = () => {
  const sessionFlag = localStorage.getItem(SESSION_KEY);

  if (sessionFlag !== "true") {
    loginArea.style.display = "flex";
    document.getElementById("chat-area").style.display = "none";
  }
};

checkForSession();

// Check Account Status
const checkAccountStatus = async () => {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return;

  try {
    const snapshot = await get(child(ref(db), `${USER_PATH}${user}`));
    if (!snapshot.exists()) {
      localStorage.clear();
      loginArea.style.display = "flex";
      location.reload();
    }
  } catch (error) {
    console.error("Error checking account status:", error);
  }
};

checkAccountStatus();

// Store Login Session
const loginSession = (username) => {
  localStorage.setItem(USER_KEY, username);
  localStorage.setItem(SESSION_KEY, "true");
  clearForm();
  location.reload();
};

// Display Error Message
const displayError = (element, message) => {
  element.innerText = message;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 3000);
};

// Form Validation
const loginFormValidation = () => {
  const alphanumeric = /^[a-zA-Z0-9]+$/;

  if (!username.value) {
    displayError(usernameErrorMessage, "Please enter username!");
  } else if (username.value.includes(" ")) {
    displayError(usernameErrorMessage, "Username should not contain spaces!");
  } else if (!alphanumeric.test(username.value)) {
    displayError(usernameErrorMessage, "Username should only contain alphabets and numbers!");
  } else if (!password.value) {
    displayError(passwordErrorMessage, "Please enter password!");
  } else {
    checkUserExistence();
  }
};

loginButton.addEventListener("click", loginFormValidation);

// Check User Existence
const checkUserExistence = async () => {
  const userRef = child(ref(db), `${USER_PATH}${username.value.toLowerCase()}`);
  
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const user = snapshot.val();
      authenticateUser(user.username, user.password);
    } else {
      createUserAccount();
    }
  } catch (error) {
    console.error("Error checking user existence:", error);
  }
};

// Authenticate User
const authenticateUser = (storedUsername, storedPassword) => {
  if (username.value.toLowerCase() === storedUsername && password.value === storedPassword) {
    loginSession(username.value.toLowerCase());
  } else {
    displayError(passwordErrorMessage, "Invalid Password!");
  }
};

// Create User Account
const createUserAccount = async () => {
  const lowercaseUsername = username.value.toLowerCase();
  const path = `${USER_PATH}${lowercaseUsername}`;

  try {
    await set(ref(db, path), { username: lowercaseUsername, password: password.value });
    loginSession(lowercaseUsername);
  } catch (error) {
    console.error("Error creating user account:", error);
  }
};

// Handle Chat Display
const displayNewChat = (newChat) => {
  const messageClass = newChat.user === localStorage.getItem(USER_KEY) ? "outgoing-message" : "incomming-message";
  chatArea.innerHTML += `
    <div class="${messageClass}">
      <p class="name">${newChat.user}</p>
      <p class="msg">${newChat.message}</p>
      <span class="time">${newChat.time}</span>
    </div>`;
  
  if (messageClass === "incomming-message" && initialMessagesLoaded) {
    incommingMessageTone.play();
  }
  
  window.scrollTo(0, document.body.scrollHeight);
};

// Clear Chat
const clearChat = async () => {
  try {
    await remove(ref(db, CHAT_PATH));
    location.reload();
  } catch (error) {
    console.error("Error clearing chat:", error);
  }
};

clearChatOption.addEventListener("click", clearChat);

// Log Out
const logout = () => {
  localStorage.clear();
  loginArea.style.display = "flex";
};

logoutOption.addEventListener("click", logout);

// Send Chat Message
const sendChatMessage = async (message) => {
  const newMessageRef = push(ref(db, CHAT_PATH));

  try {
    await set(newMessageRef, {
      user: localStorage.getItem(USER_KEY),
      message,
      time: getCurrentTime(),
    });
  } catch (error) {
    console.error("Error sending chat message:", error);
  }
};

sendButton.addEventListener("click", () => {
  if (prompt.value.trim()) {
    sendChatMessage(prompt.value);
    outgoingMessageTone.play();
    prompt.value = "";
  }
});

// Get Current Time
const getCurrentTime = () => {
  const date = new Date();
  const hr = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${hr}:${min}`;
};

// Check for New Messages
const checkForNewMessages = () => {
  const chatRef = ref(db, CHAT_PATH);
  
  onChildAdded(chatRef, (snapshot) => {
    displayNewChat(snapshot.val());
    document.getElementById("chat-loading").style.display = "none";
  });

  get(child(ref(db), CHAT_PATH)).then((snapshot) => {
    initialMessagesLoaded = true;
    if (!snapshot.exists()) {
      document.getElementById("chat-loading").style.display = "none";
    }
  }).catch((error) => {
    console.error("Error checking for new messages:", error);
  });
};

checkForNewMessages();

// Toggle About Area
const toggleAboutArea = () => {
  aboutArea.classList.toggle("active-about-area");
};

aboutUsOption.addEventListener("click", toggleAboutArea);
document.getElementById("about-close-button").addEventListener("click", toggleAboutArea);

// Toggle Contact Area
const toggleContactArea = () => {
  contactArea.classList.toggle("active-contact-area");
  contactName.value = "";
  contactEmail.value = "";
  contactMessage.value = "";
};

contactUsOption.addEventListener("click", toggleContactArea);
document.getElementById("contact-close-button").addEventListener("click", toggleContactArea);

// Show Alert Message
const showAlertMessage = (color, message) => {
  contactAlertMessage.style.display = "block";
  contactAlertMessage.style.color = color;
  contactAlertMessage.innerText = message;
  setTimeout(() => {
    contactAlertMessage.style.display = "none";
  }, 3000);
};

// Handle Contact Me
const handleContactMe = async () => {
  if (!contactName.value.trim() || !contactEmail.value.trim() || !contactMessage.value.trim()) {
    showAlertMessage("#ff4b4b", "Fill in all the fields!");
    return;
  }

  const path = `${CONTACT_PATH}${contactName.value.trim()}`;

  try {
    await set(ref(db, path), {
      name: contactName.value.trim(),
      email: contactEmail.value.trim(),
      message: contactMessage.value.trim(),
    });
    showAlertMessage("#21C063", "Message has been sent successfully!");
    contactName.value = "";
    contactEmail.value = "";
    contactMessage.value = "";
  } catch (error) {
    console.error("Error sending contact message:", error);
  }
};

contactSendButton.addEventListener("click", handleContactMe);
