(function() {
    'use strict';

    angular
        .module('controllers', [])
        .controller("ChatCtrl", ChatCtrl)
        .controller("LoginCtrl", LoginCtrl)
        .controller("UsersCtrl", UsersCtrl)
        .controller("FriendsCtrl", FriendsCtrl)
        .controller("SettingCtrl", SettingCtrl)
        .controller("ProfileCtrl", ProfileCtrl)
        .controller("NotificationCtrl", NotificationCtrl);

    LoginCtrl.$inject = ["$scope", "$ionicModal", "$state", "$firebaseAuth", "$ionicLoading", "$rootScope", "CONFIG", "UserService"];

    function LoginCtrl($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, CONFIG, UserService) {

        var vm = this;
        var ref = firebase.database().ref();

        angular.extend(vm, {
            user: {},
            patterns: {
                email: /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/
            },
            createUser: createUser,
            login: login
        });

        $ionicModal.fromTemplateUrl('templates/register.html', {
            scope: $scope
        }).then(function(modal) {
            vm.modal = modal;
        });

        function createUser() {
            UserService.createUser(vm.user).then(function() {
                vm.modal.hide();
            })
        }

        function login() {
            UserService.login(vm.user);
        }

        function signInWithFaceBook() {
            FacebookService.login().then(function(userData) {
                ref.child("users").child(userData.uid).set({
                    id: userData.uid,
                    email: userData.facebook.email,
                    username: userData.facebook.displayName
                });
                $state.go('tab.users');
            });
        }
        console.log("Login controller loading...");
    }

    FriendsCtrl.$inject = ['$scope', "$timeout", "$state", "$rootScope", "UserService"];

    function FriendsCtrl($scope, $timeout, $state, $rootScope, UserService) {
        var vm = this;

        angular.extend(vm, {
            users: [],
            refresh: refresh,
            openChat: openChat,
            openProfile: openProfile,
            currentUser: UserService.getProfile()
        });

        function getFriends() {
            UserService.getFriendsId(function(list) {
                list.forEach(function(item) {
                    UserService.getUserProfile(item, function(data) {
                        if (data.id !== vm.currentUser.id) {
                            vm.users.push(data);
                            console.log(vm.users);
                        }
                    });
                });
            });
        };

        function openChat(user) {
            $state.go('chat', { id: user.id });
        }

        function refresh() {
            $scope.$broadcast('scroll.refreshComplete');
        }

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        (function() {
            getFriends();
        })();

        console.log("Friends controller loading...");
    }

    UsersCtrl.$inject = ['$scope', "$state", "$timeout", "$rootScope", "UserService", "Rooms", "Invite"];

    function UsersCtrl($scope, $state, $timeout, $rootScope, UserService, Rooms, Invite) {
        var vm = this;

        angular.extend(vm, {
            refresh: refresh,
            users: [],
            getUsers: getUsers,
            invite: invite,
            openProfile: openProfile,
            currentUser: null
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.getUsers(function(status) {
                if (status) {

                }
            });
        });

        function getUsers(callback) {
            vm.users = [];
            vm.currentUser = UserService.getProfile();

            UserService.getUsers().$ref().once('value', function(snapshot) {
                snapshot.forEach(function(item) {
                    var $item = item.val();
                    if (($item.id !== vm.currentUser.id) && !(vm.currentUser.friends.indexOf($item.id) > -1)) {
                        $item.invite_status = Invite.getStatus($item.id);
                        vm.users.push($item);
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            });
        };

        function invite(addUserinfo) {
            Invite.send(addUserinfo);
            vm.users.map(function(item, key) {
                if (item.id === addUserinfo.id) {
                    vm.users[key].invite_status = false;
                }
            });
        };

        function refresh() {
            vm.getUsers(function(status) {
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        console.log("Users controller loading...");
    };

    ChatCtrl.$inject = ['$scope', '$state', '$ionicScrollDelegate', '$rootScope', 'Message', "UserService", "Rooms"];

    function ChatCtrl($scope, $state, $ionicScrollDelegate, $rootScope, Message, UserService, Rooms) {
        var vm = this;
        var $roomId = null;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            user: null,
            newMessage: "",
            messages: [],
            chatUser: chatUser,
            sendMessage: sendMessage,
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.chatUser();
            Rooms.getRoomId($state.params.id, function(roomId) {
                console.log("Room Id", roomId);
                $roomId = roomId;
                Message.getMessages($roomId, function(messages) {
                    vm.messages = messages;
                });
            });
        });

        function chatUser() {
            UserService.getUserProfile($state.params.id, function(data) {
                vm.user = data
            });
        }

        function sendMessage(message) {
            Message.send(message).then(function() {
                Message.getMessages($roomId, function(messages) {
                    vm.messages = messages;
                });
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom(true);
            });
            vm.newMessage = "";
        }

        console.log("Chat controller loading...");
    }

    SettingCtrl.$inject = ['$scope', "$state", "UserService"];

    function SettingCtrl($scope, $state, UserService) {
        var vm = this;

        angular.extend(vm, {
            refresh: refresh,
            user: null
        });

        function getuserDetails() {
            vm.user = null;
            return vm.user = UserService.getProfile();
        };

        function refresh() {
            if (getuserDetails()) {
                $scope.$broadcast('scroll.refreshComplete');
            }
        }

        (function() {
            getuserDetails();
            console.log(getuserDetails());
        })();

        console.log("Settings controller loading...");
    }

    ProfileCtrl.$inject = ['$scope', "$state", "UserService"];

    function ProfileCtrl($scope, $state, UserService) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            user: null
        });

        UserService.getUserProfile($state.params.id, function(userData) {
            vm.user = userData;
        });

        console.log("Profile controller loading...");
    }

    NotificationCtrl.$inject = ['$scope', "$state", "UserService", "Invite"];

    function NotificationCtrl($scope, $state, UserService, Invite) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            showload: false,
            refresh: refresh,
            accept: accept,
            declain: declain,
            notifications: [],
            getNotifications: getNotifications
        });

        function accept(notifObj, type) {
            switch (type.toLowerCase()) {
                case 'invite':
                    Invite.$accept(notifObj.id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.id
                            });
                            $scope.$apply(); // refreshing UI
                        }
                        // show error message
                    });
                    break;
                default:
                    break;
            }
        };

        function declain(notifObj, type) {
            switch (type.toLowerCase()) {
                case 'invite':
                    Invite.$remove(notifObj.id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.id
                            });
                            $scope.$apply(); // refreshing UI
                        }
                        // show error message
                    });
                    break;
                default:
                    break;
            }
        };

        function getNotifications() {
            UserService.getUserNotifications(function(notifications) {
                notifications.$ref().once('value', function(snapshot) {
                    vm.notifications = snapshot.val();
                });
            });
        };

        function refresh() {
            if (vm.getNotifications()) {
                $scope.$broadcast('scroll.refreshComplete');
            } else {
                $scope.$broadcast('scroll.refreshComplete');
            }
        };

        (function() {
            vm.getNotifications();
        })();

        console.log("Profile controller loading...");
    }
})();