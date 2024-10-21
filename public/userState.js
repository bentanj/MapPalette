// userState.js
export const userState = {
    userID: null,
    username: null,
    
    // Function to set user data
    setUserData(userID, username) {
      this.userID = userID;
      this.username = username;
    },
  
    // Function to clear user data
    clearUserData() {
      this.userID = null;
      this.username = null;
    }
  };
  