$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  const $navWelcome = $("#nav-welcome");
  const $userProfile = $("#user-profile");
  const $favoriteArticles = $("#favorited-articles");
  const $editProfileForm = $("#edit-profile-form");
  const $editForm = $("#edit-article-form");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  $userProfile.hide();

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements([
      $userProfile,
      $favoriteArticles,
      $submitForm,
      $editProfileForm,
    ]);
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    currentUser = await getCurrentUser();
    await generateStories();
    if (currentUser) showNavForLoggedInUser();
  }

  async function getCurrentUser() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    return (currentUser = await User.getLoggedInUser(token, username));
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    const favorite = checkIfUserFavorite(story.storyId);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="pencil ${$ownStories.is(":hidden") && "hidden"}">
          <i class="fas fa-pencil-alt"></i>
        </span>
        <span class="trash-can ${$ownStories.is(":hidden") && "hidden"}">
          <i class="fas fa-trash-alt"></i>
        </span>
        <span class="star ${!currentUser && "hidden"}">
          <i class="${favorite ? "fas" : "far"} fa-star" ></i >
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $('.main-nav-links, #user-profile').removeClass('hidden');
    $navWelcome.show();
    $('#nav-user-profile').text(currentUser.username);

  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  // Get user profile when clicking on username on navbar 
  $("#nav-user-profile").on("click", async function(e) {
    e.preventDefault();
    hideElements([
      $favoriteArticles,
      $submitForm,
      $allStoriesList,
      $editProfileForm,
    ]);
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    $userProfile.show();
    $userProfile.find("#userProfileTitle").show();
    $userProfile.find("section").show();
  });

  // Event handler for Navigation to Submit page
  $("#nav-submit").on("click", async function(e) {
    e.preventDefault();
    hideElements([$userProfile, $favoriteArticles]);
    await generateStories();
    $allStoriesList.show();
    $submitForm.slideDown();
  });

  // Create a story 
  $submitForm.on("submit", async (e) => {
    e.preventDefault();
    await StoryList.addStory(currentUser, {
      author: e.target.elements.author.value,
      title: e.target.elements.title.value,
      url: e.target.elements.url.value,
    });
    $submitForm.slideUp();
    $submitForm[0].reset();
    currentUser = await getCurrentUser();
    await generateStories();
  });

  // Event handler for Navigation to Favorites page 
  $("#nav-favorites").on("click", async function(e) {
    e.preventDefault();
    hideElements([
      $userProfile,
      $submitForm,
      $allStoriesList,
      $ownStories,
      $editProfileForm,
    ]);
    const h5 = $favoriteArticles.find("h5");
    const listItems = $favoriteArticles.find("li");
    filterStories(h5, listItems, $favoriteArticles, currentUser.favorites);
  });

  /* Event handler for Navigation to My Stories page */
  $("#nav-my-stories").on("click", async (e) => {
    e.preventDefault();
    hideElements([
      $userProfile,
      $favoriteArticles,
      $submitForm,
      $allStoriesList,
      $editProfileForm,
    ]);
    const h5 = $ownStories.find("h5");
    const listItems = $ownStories.find("li");
    filterStories(h5, listItems, $ownStories, currentUser.ownStories);
  });

  /* Filter $favoriteArticles & $ownStories */
  function filterStories(h5, listItems, stories, userStories) {
    if (listItems.length) listItems.remove();
    stories.show();
    if (userStories.length) {
      h5.hide();
      for (let story of userStories) {
        const result = generateStoryHTML(story);
        stories.append(result);
      }
      return;
    }
    h5.show();
  }

  /* Handle favorite action for $allStories/$favoriteArticles/$ownStories */
  $allStoriesList
    .add($favoriteArticles)
    .add($ownStories)
    .on("click", ".fa-star", async (e) => {
      await handleFavorite(e);
    });

  /* Favorite a story */
  async function handleFavorite(e) {
    if (!currentUser) return;
    if (e.target.classList.contains("fas")) {
      await uncheckFavorite(e);
      return;
    }
    await checkFavorite(e);
  }

  /* User adds a favorite story */
  const checkFavorite = async (e) => {
    const favorite = await User.addFavorite(
      currentUser,
      e.target.parentNode.parentNode.id
    );
    if (favorite) {
      // get the updated user w/ favorites
      currentUser = getCurrentUser();
      e.target.classList.remove("far");
      e.target.classList.add("fas");
    }
  };

  /* User removes a favorite story */
  const uncheckFavorite = async (e) => {
    const removed = await User.removeFavorite(
      currentUser,
      e.target.parentNode.parentNode.id
    );
    if (removed) {
      // get the updated user w/ favorites
      currentUser = getCurrentUser();
      e.target.classList.remove("fas");
      e.target.classList.add("far");
      if ($favoriteArticles.is(":visible"))
        e.target.parentNode.parentNode.remove();
      if (!$favoriteArticles.find("li").length)
        $favoriteArticles.find("h5").show();
    }
  };
  
  /* Check if story is a user's favorite */
  function checkIfUserFavorite(storyId) {
    return currentUser &&
      currentUser.favorites.find((fav) => fav.storyId == storyId)
      ? true
      : false;
  }

  /* Delete user's own story */
  $ownStories.on("click", ".fa-trash-alt", async (e) => {
    const story = e.target.parentNode.parentNode;
    if (await StoryList.deleteStory(currentUser, story.id)) {
      currentUser = await getCurrentUser();
      story.remove();
      if (!$ownStories.find("li").length) $ownStories.find("h5").show();
    }
  });

  /* Edit a user's story */
  $ownStories.on("click", ".fa-pencil-alt", async (e) => {
    $editForm.slideDown();
    const li = e.target.parentNode.parentNode;
    $("#storyId").val(li.id);
    $("#author").val($(li).find(".article-author").text().split(" ")[1]);
    $("#title").val($(li).find(".article-link strong").text());
    $("#url").val($(li).find(".article-link").attr("href"));
  });

  /* Update a user's story */
  $editForm.on("submit", async (e) => {
    e.preventDefault();
    const { storyId, author, title, url } = e.target.elements;
    const updated = await StoryList.updateStory(currentUser, storyId.value, {
      author: author.value,
      title: title.value,
      url: url.value,
    });
    if (updated) {
      currentUser = await getCurrentUser();
      $ownStories
        .find(`#${storyId.value} .article-link`)
        .attr("href", url.value)
        .find("strong")
        .text(title.value);
      $ownStories
        .find(`#${storyId.value} .article-author`)
        .text(`by ${author.value}`);
      $ownStories
        .find(`#${storyId.value} .article-hostname`)
        .text(getHostName(url.value));
      $editForm.slideUp();
      setTimeout(function () {
        $editForm[0].reset();
      }, 100);
    }
  });

  /* Cancel editing a user's story */
  $(".edit-cancel-button").on("click", (e) => {
    $editForm.slideUp();
    $editForm[0].reset();
    if ($editProfileForm.is(":visible")) {
      $editProfileForm.hide();
      $editProfileForm[0].reset();
      $userProfile.find("#userProfileTitle").show();
      $userProfile.find("section").show();
    }
  });

});
