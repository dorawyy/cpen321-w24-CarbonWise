package com.example.carbonwise.ui.friends

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.carbonwise.databinding.FragmentFriendsBinding
import com.google.android.material.tabs.TabLayoutMediator

class FriendsFragment : Fragment() {

    private var _binding: FragmentFriendsBinding? = null
    private val binding get() = _binding!!

    private lateinit var friendsViewModel: FriendsViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        friendsViewModel = ViewModelProvider(requireActivity())[FriendsViewModel::class.java]
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentFriendsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupViewPager()
        setupUI()

    }

    private fun setupViewPager() {
        binding.viewPager.adapter = FriendsPagerAdapter(this)

        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Friends"
                1 -> "Requests"
                else -> throw IllegalStateException("Unexpected tab position: $position")
            }
        }.attach()
    }

    private fun setupUI() {
        friendsViewModel.userFriendCode.observe(viewLifecycleOwner) { friendCode ->
            binding.textFriendCode.text = "Your Friend Code: $friendCode"
        }

        binding.buttonAddFriend.setOnClickListener {
            val friendCode = binding.editFriendCode.text.toString().trim()
            if (friendCode.isNotEmpty()) {
                friendsViewModel.sendFriendRequest(friendCode)
                hideKeyboardAndClearFocus()
                binding.editFriendCode.text.clear()
                Toast.makeText(requireContext(), "Friend request sent!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(requireContext(), "Enter a valid friend code", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun hideKeyboardAndClearFocus() {
        val imm = requireContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(binding.editFriendCode.windowToken, 0)
        binding.editFriendCode.clearFocus()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
