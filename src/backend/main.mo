import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Char "mo:core/Char";


actor {
  include MixinStorage();

  type Account = {
    firstName : Text;
    lastName : Text;
    dob : Text;
    phone : Text;
    password : Text;
  };

  type OTP = {
    code : Nat;
    expiresAt : Time.Time;
  };

  type Message = {
    sender : Text;
    content : Text;
    timestamp : Time.Time;
  };

  type Photo = Storage.ExternalBlob;
  let photos = Map.empty<Nat, Photo>();
  var nextPhotoId = 1;

  type StarOfTheMonth = {
    month : Text;
    name : Text;
    position : Text;
  };

  type Birthday = {
    name : Text;
    date : Text;
  };

  type MeetLink = {
    title : Text;
    url : Text;
  };

  type ImportantMessage = {
    id : Nat;
    content : Text;
    author : Text;
    dismissed : Bool;
  };

  public type UserProfile = {
    firstName : Text;
    lastName : Text;
    phone : Text;
  };

  // Storage
  let accounts = Map.empty<Text, Account>();
  let otps = Map.empty<Text, OTP>();
  let messages = List.empty<Message>();
  let stars = Map.empty<Text, StarOfTheMonth>();
  let birthdays = Map.empty<Text, Birthday>();
  let meetLinks = Map.empty<Text, MeetLink>();
  let importantMessages = Map.empty<Nat, ImportantMessage>();
  var nextImportantMessageId = 1;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Photo Blob Upload
  public shared ({ caller }) func uploadPhoto(blob : Storage.ExternalBlob) : async Nat {
    let id = nextPhotoId;
    photos.add(id, blob);
    nextPhotoId += 1;
    id;
  };

  public query ({ caller }) func getPhoto(id : Nat) : async ?Photo {
    photos.get(id);
  };

  public query ({ caller }) func getAllPhotos() : async [(Nat, Photo)] {
    photos.toArray();
  };

  public shared ({ caller }) func deletePhoto(id : Nat) : async () {
    photos.remove(id);
  };

  // User Profile Management (Required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Account Management - Requires user authentication
  public shared ({ caller }) func registerAccount(firstName : Text, lastName : Text, dob : Text, phone : Text, password : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register accounts");
    };
    if (accounts.containsKey(phone)) {
      Runtime.trap("Account already exists");
    };
    let account : Account = {
      firstName;
      lastName;
      dob;
      phone;
      password;
    };
    accounts.add(phone, account);
  };

  public shared ({ caller }) func updateAccount(phone : Text, firstName : Text, lastName : Text, dob : Text, password : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update accounts");
    };
    switch (accounts.get(phone)) {
      case (null) { Runtime.trap("Account does not exist") };
      case (?_) {
        let updatedAccount : Account = {
          firstName;
          lastName;
          dob;
          phone;
          password;
        };
        accounts.add(phone, updatedAccount);
      };
    };
  };

  public query ({ caller }) func getAccount(phone : Text) : async Account {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view accounts");
    };
    switch (accounts.get(phone)) {
      case (null) { Runtime.trap("Account does not exist") };
      case (?account) { account };
    };
  };

  public query ({ caller }) func getAllAccounts() : async [Account] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view accounts");
    };
    accounts.values().toArray();
  };

  // OTP Verification - Available to guests (for registration flow)
  public shared ({ caller }) func generateOTP(phone : Text) : async Nat {
    let code = 100_000 + (Time.now() % 900_000).toNat();
    let otp : OTP = {
      code;
      expiresAt = Time.now() + 50_000_000_000;
    };
    otps.add(phone, otp);
    code;
  };

  public shared ({ caller }) func verifyOTP(phone : Text, code : Nat) : async Bool {
    switch (otps.get(phone)) {
      case (null) { false };
      case (?otp) {
        if (Time.now() > otp.expiresAt) {
          otps.remove(phone);
          false;
        } else if (otp.code == code) {
          otps.remove(phone);
          true;
        } else {
          false;
        };
      };
    };
  };

  // Chat Messages - Users can send, anyone can read
  public shared ({ caller }) func sendMessage(sender : Text, content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let message : Message = {
      sender;
      content;
      timestamp = Time.now();
    };
    messages.add(message);
  };

  public query ({ caller }) func getAllMessages() : async [Message] {
    messages.toArray();
  };

  // Star of the Month - Admin only for modifications
  public shared ({ caller }) func addOrUpdateStar(month : Text, name : Text, position : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add or update stars");
    };
    let star : StarOfTheMonth = {
      month;
      name;
      position;
    };
    stars.add(month, star);
  };

  public shared ({ caller }) func deleteStar(month : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete stars");
    };
    if (not stars.containsKey(month)) {
      Runtime.trap("Month does not exist");
    };
    stars.remove(month);
  };

  public query ({ caller }) func getAllStars() : async [StarOfTheMonth] {
    stars.values().toArray();
  };

  // Birthdays - Admin only for modifications
  public shared ({ caller }) func addOrUpdateBirthday(name : Text, date : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add or update birthdays");
    };
    let bday : Birthday = {
      name;
      date;
    };
    birthdays.add(name, bday);
  };

  public shared ({ caller }) func deleteBirthday(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete birthdays");
    };
    if (not birthdays.containsKey(name)) {
      Runtime.trap("Name does not exist");
    };
    birthdays.remove(name);
  };

  public query ({ caller }) func getAllBirthdays() : async [Birthday] {
    birthdays.values().toArray();
  };

  // Meet Links - Admin only for modifications
  public shared ({ caller }) func addOrUpdateMeetLink(title : Text, url : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add or update meet links");
    };
    let link : MeetLink = {
      title;
      url;
    };
    meetLinks.add(title, link);
  };

  public shared ({ caller }) func deleteMeetLink(title : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete meet links");
    };
    if (not meetLinks.containsKey(title)) {
      Runtime.trap("Title does not exist");
    };
    meetLinks.remove(title);
  };

  public query ({ caller }) func getAllMeetLinks() : async [MeetLink] {
    meetLinks.values().toArray();
  };

  // Important Messages - Custom authorization (Aaron/Nevveen) + role-based
  public shared ({ caller }) func addImportantMessage(content : Text, author : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add important messages");
    };

    let lowerAuthor = author.map(
      func(c) {
        if (c >= 'A' and c <= 'Z') {
          Char.fromNat32(c.toNat32() + 32);
        } else { c };
      }
    );

    if (not (Text.equal(lowerAuthor, "aaron") or Text.equal(lowerAuthor, "nevveen"))) {
      Runtime.trap("Only Aaron or Nevveen can add important messages");
    };

    let message : ImportantMessage = {
      id = nextImportantMessageId;
      content;
      author;
      dismissed = false;
    };
    importantMessages.add(nextImportantMessageId, message);
    nextImportantMessageId += 1;
  };

  public shared ({ caller }) func updateImportantMessage(id : Nat, content : Text, author : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update important messages");
    };

    switch (importantMessages.get(id)) {
      case (null) { Runtime.trap("Message does not exist") };
      case (?_) {
        let lowerAuthor = author.map(
          func(c) {
            if (c >= 'A' and c <= 'Z') {
              Char.fromNat32(c.toNat32() + 32);
            } else { c };
          }
        );

        if (not (Text.equal(lowerAuthor, "aaron") or Text.equal(lowerAuthor, "nevveen"))) {
          Runtime.trap("Only Aaron or Nevveen can update important messages");
        };

        let updatedMessage : ImportantMessage = {
          id;
          content;
          author;
          dismissed = false;
        };
        importantMessages.add(id, updatedMessage);
      };
    };
  };

  public shared ({ caller }) func dismissImportantMessage(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can dismiss important messages");
    };
    switch (importantMessages.get(id)) {
      case (null) { Runtime.trap("Message does not exist") };
      case (?message) {
        let updatedMessage : ImportantMessage = {
          id = message.id;
          content = message.content;
          author = message.author;
          dismissed = true;
        };
        importantMessages.add(id, updatedMessage);
      };
    };
  };

  public query ({ caller }) func getAllImportantMessages() : async [ImportantMessage] {
    let allMessages = importantMessages.values().toArray();
    allMessages.filter(
      func(msg) { not msg.dismissed }
    );
  };
};
