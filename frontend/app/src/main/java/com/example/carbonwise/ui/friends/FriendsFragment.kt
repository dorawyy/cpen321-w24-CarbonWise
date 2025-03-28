package com.example.carbonwise.ui.friends

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.Observer
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
        //setupUI()

        friendsViewModel.networkFailure.observe(viewLifecycleOwner) { failure ->
            if (failure) {
                Toast.makeText(context, "Network error, please try again later", Toast.LENGTH_SHORT).show()
                friendsViewModel.networkFailure.value = false
            }
        }

        binding.fabAddFriend.setOnClickListener {
            val dialog = AddFriendDialogFragment()
            dialog.show(childFragmentManager, "AddFriendDialog")
        }

        friendsViewModel.friendActions.observeOnce(viewLifecycleOwner) { message ->
            if (message.isNotEmpty()) {
                if (message.contains("request", ignoreCase = true)) {
                    Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
                    friendsViewModel._friendActions.value = ""
                }
            }
        }
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

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    fun <T> LiveData<T>.observeOnce(owner: LifecycleOwner, observer: Observer<T>) {
        observe(owner, object : Observer<T> {
            override fun onChanged(value: T) {
                removeObserver(this)
                observer.onChanged(value)
            }
        })
    }
}
