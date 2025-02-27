package com.example.carbonwise.ui.history

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.databinding.FragmentHistoryBinding
import com.example.carbonwise.MainActivity
import com.example.carbonwise.R
import com.example.carbonwise.ui.info.InfoFragment
import androidx.navigation.fragment.findNavController

class HistoryFragment : Fragment() {

    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!
    private lateinit var historyAdapter: HistoryAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHistoryBinding.inflate(inflater, container, false)
        val root: View = binding.root

        // Set up RecyclerView
        val recyclerView = binding.recyclerViewHistory
        recyclerView.layoutManager = LinearLayoutManager(context)

        // Initialize the adapter and set the click listener for items
        historyAdapter = HistoryAdapter { upcCode ->
            openProductInfoFragment(upcCode)
        }
        recyclerView.adapter = historyAdapter

        // Fetch history data
        fetchHistory()

        return root
    }

    private fun fetchHistory() {
        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty()) {
            Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
            return
        }

        if (HistoryCacheManager.isCacheValid(requireContext())) {
            // Load from cache
            HistoryCacheManager.loadHistoryFromCache(requireContext())?.let { historyItems ->
                val allProducts = historyItems.flatMap { it.products }
                    .sortedByDescending { it.timestamp } // Sort products by timestamp (most recent first)
                    .map { it.product }

                historyAdapter.submitList(allProducts)
            }
        } else {
            // Fetch in background
            HistoryCacheManager.fetchHistoryInBackground(requireContext())
        }
    }

    private fun openProductInfoFragment(upcCode: String) {
        val productInfoFragment = InfoFragment.newInstance(upcCode)
        findNavController().navigate(R.id.action_historyFragment_to_infoFragment, productInfoFragment.arguments)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}