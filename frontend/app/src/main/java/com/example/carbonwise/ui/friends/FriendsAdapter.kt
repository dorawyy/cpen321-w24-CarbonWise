package com.example.carbonwise.ui.friends

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.PopupMenu
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R
import com.example.carbonwise.databinding.ItemFriendBinding
import com.example.carbonwise.network.Friend

class FriendsAdapter(
    private var friends: MutableList<Friend>,
    private val onRemoveFriend: (Friend) -> Unit,
    private val onViewHistory: (Friend) -> Unit,
    private var friendEcoscores: Map<String, Double> = emptyMap()
) : RecyclerView.Adapter<FriendsAdapter.FriendViewHolder>() {

    class FriendViewHolder(val binding: ItemFriendBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FriendViewHolder {
        val binding = ItemFriendBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return FriendViewHolder(binding)
    }

    override fun onBindViewHolder(holder: FriendViewHolder, position: Int) {
        val friend = friends[position]
        val name = friend.name ?: "Unknown Friend"
        val ecoscoreDouble = friendEcoscores[friend.user_uuid] ?: 0.0
        val ecoscoreInt = ecoscoreDouble.toInt()

        // Circular progress
        holder.binding.progressEcoscore.setProgressCompat(ecoscoreInt, false)

        holder.binding.textFriendName.text = "$name"

        holder.binding.textEcoscoreValue.text = ecoscoreInt.toString()

        holder.binding.textFriendName.setOnClickListener {
            onViewHistory(friend)
        }

        holder.binding.buttonOptions.setOnClickListener { view ->
            val popupMenu = PopupMenu(view.context, view)
            popupMenu.inflate(R.menu.friend_options_menu)
            popupMenu.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    R.id.menu_remove_friend -> {
                        onRemoveFriend(friend)
                        true
                    }
                    else -> false
                }
            }
            popupMenu.show()
        }
    }

    override fun getItemCount(): Int = friends.size

    fun updateFriends(newFriends: List<Friend>) {
        friends.clear()
        friends.addAll(newFriends)
        notifyDataSetChanged()
    }

    fun updateFriendEcoscores(newEcoscores: Map<String, Double>) {
        friendEcoscores = newEcoscores
        notifyDataSetChanged()
    }
}
