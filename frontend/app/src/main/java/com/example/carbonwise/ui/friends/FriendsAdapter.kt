package com.example.carbonwise.ui.friends

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.PopupMenu
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R
import com.example.carbonwise.databinding.ItemFriendBinding

class FriendsAdapter(
    private var friends: MutableList<String>,
    private val onRemoveFriend: (String) -> Unit
) : RecyclerView.Adapter<FriendsAdapter.FriendViewHolder>() {

    class FriendViewHolder(val binding: ItemFriendBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FriendViewHolder {
        val binding = ItemFriendBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return FriendViewHolder(binding)
    }

    override fun onBindViewHolder(holder: FriendViewHolder, position: Int) {
        val friend = friends[position]
        holder.binding.textFriendName.text = friend

        holder.binding.buttonOptions.setOnClickListener { view ->
            val popupMenu = PopupMenu(view.context, view)
            popupMenu.inflate(R.menu.friend_options_menu)
            popupMenu.setOnMenuItemClickListener { item ->
                if (item.itemId == R.id.menu_remove_friend) {
                    onRemoveFriend(friend)
                    true
                } else false
            }
            popupMenu.show()
        }
    }

    override fun getItemCount(): Int = friends.size

    fun updateFriends(newFriends: List<String>) {
        friends = newFriends.toMutableList()
        notifyDataSetChanged()
    }
}
