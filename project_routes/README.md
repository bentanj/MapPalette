To implement:
1. Add logic to filters - [location, popularity (most popular, trending, least popular), time created (newest, oldest), distance (shortest - longest, longest-shortest)]
2. Map navigation for navbar items and "Create Your Own Route" button.
3. Bind database to card Vue data objects - the data objects populates card and modal.

 { // sample data object structure
    title: "",
    description: "",
    distance: "",
    location: "",
    image: "",
    date: "",
    likes: ,
    comments: 0,
    modalId: "", // which modal id does this data populate
    author: "",
    commentsList: [
        { name: "", text: "" },
        { name: "", text: "" }
    ]
    }


Notes:
1. Template functions to create card and modal are included js script below