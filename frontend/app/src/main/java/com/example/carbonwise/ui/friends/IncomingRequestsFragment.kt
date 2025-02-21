package com.example.carbonwise.ui.friends

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.databinding.FragmentIncomingRequestsBinding

class IncomingRequestsFragment : Fragment() {

    private var _binding: FragmentIncomingRequestsBinding? = null
    private val binding get() = _binding!!

    private val friendsViewModel: FriendsViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentIncomingRequestsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val adapter = IncomingRequestsAdapter(
            mutableListOf(),
            onAccept = { friendCode -> friendsViewModel.acceptFriendRequest(friendCode) },
            onReject = { friendCode -> friendsViewModel.rejectFriendRequest(friendCode) }
        )

        binding.recyclerIncomingRequests.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerIncomingRequests.adapter = adapter

        friendsViewModel.incomingRequests.observe(viewLifecycleOwner) { updatedList ->
            adapter.updateRequests(updatedList)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance(): IncomingRequestsFragment {
            return IncomingRequestsFragment()
        }
    }
}
