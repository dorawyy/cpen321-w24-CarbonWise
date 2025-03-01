package com.example.carbonwise.ui.friends

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.Navigation
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.R
import com.example.carbonwise.databinding.FragmentFriendsListBinding
import com.example.carbonwise.network.Friend

class FriendsListFragment : Fragment() {

    private var _binding: FragmentFriendsListBinding? = null
    private val binding get() = _binding!!

    private lateinit var friendsViewModel: FriendsViewModel

    private var currentFriendList: List<Friend> = emptyList()
    private var currentEcoscores: Map<String, Double> = emptyMap()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        friendsViewModel = ViewModelProvider(requireActivity())[FriendsViewModel::class.java]
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentFriendsListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val adapter = FriendsAdapter(
            mutableListOf(),
            onRemoveFriend = { friend ->
                friendsViewModel.removeFriend(friend.user_uuid)
            },
            onViewHistory = { friend ->
                if (friend.user_uuid.isNullOrEmpty()) {
                    Log.e("FriendsAdapter", "No friend UUID provided, cannot navigate!")
                    return@FriendsAdapter
                }

                Log.e("FriendsAdapter", "Navigating with UUID: ${friend.user_uuid}")

                val action = FriendsFragmentDirections
                    .actionFriendsFragmentToFriendsHistoryFragment(friend.user_uuid)

                Navigation.findNavController(requireActivity(), R.id.nav_host_fragment_activity_main)
                    .navigate(action)
            }

        )



        binding.recyclerFriends.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerFriends.adapter = adapter

        friendsViewModel.friendsList.observe(viewLifecycleOwner) { updatedList ->
            adapter.updateFriends(updatedList)
        }

        // Fetch the friend list from the server
        friendsViewModel.fetchFriends()
        friendsViewModel.friendEcoscores.observe(viewLifecycleOwner) { ecoscoreMap ->
            adapter.updateFriendEcoscores(ecoscoreMap)
        }
    }

    override fun onResume() {
        super.onResume()
        friendsViewModel.fetchFriends()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance(): FriendsListFragment {
            return FriendsListFragment()
        }
    }
}
