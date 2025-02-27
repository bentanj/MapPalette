export const users = [
    // Each object is a user with all of the following attributes
    {
        // personal info
        id: 'LJvFmX3tc762Uk8M3wRw',
        email: 'user1@example.com',
        username: 'user1',
        password: 'password1',
        birthday: '1990-01-01',
        gender: 'Male',
        
        // profile pic is a link to our cloud storage 
        profilePicture: 'gs://mappalette-9e0bd.appspot.com/profile_pictures/LJvFmX3tc762Uk8M3wRw/user1.png',

        // follower/following counts
        numFollowers: 2,
        numFollowing: 2,

        // Array of posts created
        postsCreated: [
            { postID: 'E7fHyD4K92jP4hU6cZ1L', createdAt: new Date('2024-10-25T14:48:32+08:00') },
            { postID: 'K3mYpX8b7jD2WkQ9nL2M', createdAt: new Date('2024-10-23T13:32:45+08:00') },
            { postID: 'T4nVpG6s5dR8TzX4mY3Q', createdAt: new Date('2024-10-20T16:12:09+08:00') }
        ],
        
        // Array of posts liked
        postsLiked: [
            { postID: 'F5hGpY2k3rL9YzW8uL2M', createdAt: new Date('2024-10-24T21:30:15+08:00') },
            { postID: 'J8fWqK1p9tN6VuL3oP9R', createdAt: new Date('2024-10-22T14:14:20+08:00') },
            { postID: 'H3jTpN5u4pW8QkL9oR8T', createdAt: new Date('2024-10-19T11:05:38+08:00') }
        ],
        
        followers: ['xL9FmK3nc762Uk9M4wQw', 'bD2LmX3td562Vk8N6wPw'],
        following: ['qW9KmY3ac792Ul7N7wRr', 'bD2LmX3td562Vk8N6wPw'] // Overlap with followers
    },
    {
        id: 'xL9FmK3nc762Uk9M4wQw',
        email: 'user2@example.com',
        username: 'user2',
        password: 'password2',
        birthday: '1992-02-02',
        gender: 'Female',
        profilePicture: 'gs://mappalette-9e0bd.appspot.com/profile_pictures/xL9FmK3nc762Uk9M4wQw/user2.png',
        
        numFollowers: 2,
        numFollowing: 2,

        postsCreated: [
            { postID: 'G6jJrQ3m4nP2tU7cM3L', createdAt: new Date('2024-10-23T20:18:45+08:00') },
            { postID: 'A1kFyT5n7jQ3VuM8oL9K', createdAt: new Date('2024-10-21T17:20:32+08:00') },
            { postID: 'C8pKrM9o2wR4XkN3qY4T', createdAt: new Date('2024-10-18T12:50:47+08:00') }
        ],
        
        postsLiked: [
            { postID: 'A2dTyP5f9jL6WqR3tM8K', createdAt: new Date('2024-10-22T22:10:05+08:00') },
            { postID: 'L9fNpJ6t3pW8QuO4nP9R', createdAt: new Date('2024-10-20T18:15:12+08:00') },
            { postID: 'D2jVqK1p9tL7WnM6oR9S', createdAt: new Date('2024-10-17T15:30:40+08:00') }
        ],
        
        followers: ['LJvFmX3tc762Uk8M3wRw', 'bD2LmX3td562Vk8N6wPw'],
        following: ['LJvFmX3tc762Uk8M3wRw', 'fS9LpX2nb512Uk7O4zPw'] // Overlap with followers
    },
    {
        id: 'bD2LmX3td562Vk8N6wPw',
        email: 'user3@example.com',
        username: 'user3',
        password: 'password3',
        birthday: '1994-03-03',
        gender: 'Prefer not to say',
        profilePicture: 'gs://mappalette-9e0bd.appspot.com/profile_pictures/bD2LmX3td562Vk8N6wPw/user3.png',
        
        numFollowers: 2,
        numFollowing: 2,

        postsCreated: [
            { postID: 'B9cHyD5j7uK1TnQ9cY5M', createdAt: new Date('2024-10-21T18:40:52+08:00') },
            { postID: 'F6rLpY3o8pQ4WvN2kY6L', createdAt: new Date('2024-10-19T20:05:28+08:00') },
            { postID: 'M8fWyT2q6dR3KuO5mL9Q', createdAt: new Date('2024-10-16T16:52:11+08:00') }
        ],
        
        postsLiked: [
            { postID: 'C3kDrJ1p5vQ8WnP4oL9R', createdAt: new Date('2024-10-20T19:45:32+08:00') },
            { postID: 'G1sLpN4u3tK8QvL9oP9T', createdAt: new Date('2024-10-18T17:30:15+08:00') },
            { postID: 'H2fTqM5n6dL7WuK4oN8P', createdAt: new Date('2024-10-17T14:14:55+08:00') }
        ],
        
        followers: ['xL9FmK3nc762Uk9M4wQw', 'LJvFmX3tc762Uk8M3wRw'],
        following: ['mX2VmH3tc792Jk8O5rPw', 'xL9FmK3nc762Uk9M4wQw'] // Overlap with followers
    },
    {
        id: 'qW9KmY3ac792Ul7N7wRr',
        email: 'user4@example.com',
        username: 'user4',
        password: 'password4',
        birthday: '1996-04-04',
        gender: 'Female',
        profilePicture: 'gs://mappalette-9e0bd.appspot.com/profile_pictures/qW9KmY3ac792Ul7N7wRr/user4.png',
        
        numFollowers: 2,
        numFollowing: 2,

        postsCreated: [
            { postID: 'D8rLkX4v7nT6QjM9oW4L', createdAt: new Date('2024-10-19T23:02:15+08:00') },
            { postID: 'K2jHrY5t8qL6WpO4nL7P', createdAt: new Date('2024-10-17T18:45:38+08:00') },
            { postID: 'A5dNpK3m7oR8WuN2kY5L', createdAt: new Date('2024-10-15T21:22:12+08:00') }
        ],
        
        postsLiked: [
            { postID: 'E5qJyK8s2pN4WuL3oR9T', createdAt: new Date('2024-10-18T21:20:47+08:00') },
            { postID: 'F3sLpN4u6tK9WvM5oQ8T', createdAt: new Date('2024-10-16T19:02:32+08:00') },
            { postID: 'J2fWyM5n8dL3KuQ9oP6R', createdAt: new Date('2024-10-15T16:38:50+08:00') }
        ],
        
        followers: ['mX2VmH3tc792Jk8O5rPw', 'fS9LpX2nb512Uk7O4zPw'],
        following: ['bD2LmX3td562Vk8N6wPw', 'mX2VmH3tc792Jk8O5rPw'] // Overlap with followers
    },
    {
        id: 'mX2VmH3tc792Jk8O5rPw',
        email: 'user5@example.com',
        username: 'user5',
        password: 'password5',
        birthday: '1998-05-05',
        gender: 'Male',
        profilePicture: 'gs://mappalette-9e0bd.appspot.com/profile_pictures/mX2VmH3tc792Jk8O5rPw/user5.png',
        
        numFollowers: 2,
        numFollowing: 2,

        postsCreated: [
            { postID: 'H7fHyT2k8rP9QuX3tK2M', createdAt: new Date('2024-10-17T22:18:32+08:00') },
            { postID: 'B5sNpJ4t6pL9WvM3oN8K', createdAt: new Date('2024-10-15T20:42:19+08:00') },
            { postID: 'C6jLpY2q4dR7KuO5mL3T', createdAt: new Date('2024-10-13T13:54:10+08:00') }
        ],
        
        postsLiked: [
            { postID: 'A2sFrJ4n1tL8WvK5oN9Q', createdAt: new Date('2024-10-16T20:50:20+08:00') },
            { postID: 'L9fMpY5o3qK8WtM2nP7R', createdAt: new Date('2024-10-14T18:22:13+08:00') },
            { postID: 'D8tLpM1s5vN4WuQ3oK7R', createdAt: new Date('2024-10-12T15:16:05+08:00') }
        ],
        
        followers: ['qW9KmY3ac792Ul7N7wRr', 'LJvFmX3tc762Uk8M3wRw'],
        following: ['fS9LpX2nb512Uk7O4zPw', 'qW9KmY3ac792Ul7N7wRr'] // Overlap with followers
    }
];

// List of userIDs present in this dummy database
const userIDs = [
    'LJvFmX3tc762Uk8M3wRw',
    'xL9FmK3nc762Uk9M4wQw',
    'bD2LmX3td562Vk8N6wPw',
    'qW9KmY3ac792Ul7N7wRr',
    'mX2VmH3tc792Jk8O5rPw'
];

// List of postIDs present in this dummy database
const postIDs = [
    'E7fHyD4K92jP4hU6cZ1L',
    'K3mYpX8b7jD2WkQ9nL2M',
    'T4nVpG6s5dR8TzX4mY3Q',
    'F5hGpY2k3rL9YzW8uL2M',
    'J8fWqK1p9tN6VuL3oP9R',
    'H3jTpN5u4pW8QkL9oR8T',
    'G6jJrQ3m4nP2tU7cM3L',
    'A1kFyT5n7jQ3VuM8oL9K',
    'C8pKrM9o2wR4XkN3qY4T',
    'A2dTyP5f9jL6WqR3tM8K',
    'L9fNpJ6t3pW8QuO4nP9R',
    'D2jVqK1p9tL7WnM6oR9S',
    'B9cHyD5j7uK1TnQ9cY5M',
    'F6rLpY3o8pQ4WvN2kY6L',
    'M8fWyT2q6dR3KuO5mL9Q',
    'C3kDrJ1p5vQ8WnP4oL9R',
    'G1sLpN4u3tK8QvL9oP9T',
    'H2fTqM5n6dL7WuK4oN8P',
    'D8rLkX4v7nT6QjM9oW4L',
    'K2jHrY5t8qL6WpO4nL7P',
    'A5dNpK3m7oR8WuN2kY5L',
    'E5qJyK8s2pN4WuL3oR9T',
    'F3sLpN4u6tK9WvM5oQ8T',
    'J2fWyM5n8dL3KuQ9oP6R',
    'H7fHyT2k8rP9QuX3tK2M',
    'B5sNpJ4t6pL9WvM3oN8K',
    'C6jLpY2q4dR7KuO5mL3T',
    'A2sFrJ4n1tL8WvK5oN9Q',
    'L9fMpY5o3qK8WtM2nP7R',
    'D8tLpM1s5vN4WuQ3oK7R'
];
