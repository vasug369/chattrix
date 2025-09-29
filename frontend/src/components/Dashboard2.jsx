import React from "react";

const stories = [
  { username: "abczhang", img: "https://via.placeholder.com/40" },
  { username: "olive_jones", img: "https://via.placeholder.com/40" },
  { username: "rtrump", img: "https://via.placeholder.com/40" },
  { username: "ngogirl", img: "https://via.placeholder.com/40" },
  { username: "brdsng", img: "https://via.placeholder.com/40" },
  { username: "mikeblk", img: "https://via.placeholder.com/40" },
  { username: "tparker11", img: "https://via.placeholder.com/40" },
  { username: "meegan22", img: "https://via.placeholder.com/40" },
];

function Dashboard() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <aside className="w-64 p-6 border-r flex flex-col space-y-4">
        <h1 className="text-2xl font-bold mb-6">Chattrix</h1>
        <nav className="flex flex-col space-y-3">
          <a href="#" className="flex items-center space-x-2 text-gray-700 font-medium">
            <span>🏠</span> <span>Home</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>🔍</span> <span>Search</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>✨</span> <span>Explore</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>🎬</span> <span>Reels</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>💬</span> <span>Messages</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>❤️</span> <span>Notifications</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>➕</span> <span>Create</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-gray-700">
            <span>👤</span> <span>Profile</span>
          </a>
        </nav>
      </aside>

      {/* Main Feed */}
      <main className="flex-1 flex flex-col items-center py-6 px-4">
        {/* Stories */}
        <div className="flex space-x-4 overflow-x-auto mb-6">
          {stories.map((story, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <img
                src={story.img}
                alt={story.username}
                className="w-14 h-14 rounded-full border-2 border-pink-500"
              />
              <span className="text-xs mt-1">{story.username}</span>
            </div>
          ))}
        </div>

        {/* Post */}
        <div className="bg-white border rounded-md w-full max-w-lg">
          <div className="flex items-center p-4">
            <img
              src="https://via.placeholder.com/32"
              alt="user"
              className="w-8 h-8 rounded-full"
            />
            <span className="ml-3 font-medium">southern_circle</span>
            <span className="ml-auto">...</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
            alt="Post"
            className="w-full"
          />
          <div className="flex justify-around p-4 text-gray-600">
            <span>❤️ 7904</span>
            <span>💬 834</span>
            <span>📤 347</span>
            <span>🔖</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
