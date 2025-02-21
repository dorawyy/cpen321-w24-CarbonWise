package com.example.carbonwise.ui.friends

import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter

class FriendsPagerAdapter(
    fragment: Fragment
) : FragmentStateAdapter(fragment) {

    override fun getItemCount(): Int {
        return 2
    }

    override fun createFragment(position: Int): Fragment {
        return when (position) {
            0 -> FriendsListFragment.newInstance()
            1 -> IncomingRequestsFragment.newInstance()
            else -> throw IllegalStateException("Invalid position: $position")
        }
    }
}
