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
import com.example.carbonwise.network.ApiService
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

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
        historyAdapter = HistoryAdapter(
            onProductClick = { productId ->
                openProductInfoFragment(productId)
            },
            onDeleteClick = { scanUuid ->
                deleteHistoryItem(scanUuid)
            }
        )
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
            val cachedHistory = HistoryCacheManager.loadHistoryFromCache(requireContext())
            cachedHistory?.let { historyAdapter.submitList(it) } // Now correctly passing List<ProductItem>
        } else {
            HistoryCacheManager.fetchHistoryInBackground(requireContext())
        }

    }

    private fun openProductInfoFragment(upcCode: String) {
        val productInfoFragment = InfoFragment.newInstance(upcCode)
        findNavController().navigate(R.id.action_historyFragment_to_infoFragment, productInfoFragment.arguments)
    }

    private fun deleteHistoryItem(scanUuid: String) {
        val token = MainActivity.getJWTToken(requireContext()) ?: return

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)
        val call = apiService.deleteFromHistory(token, scanUuid)

        call.enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    HistoryCacheManager.removeFromCache(requireContext(), scanUuid)
                    Toast.makeText(requireContext(), "History item deleted", Toast.LENGTH_SHORT).show()
                    fetchHistory() // Refresh the list
                } else {
                    HistoryCacheManager.removeFromCache(requireContext(), scanUuid)
                    Toast.makeText(requireContext(), "Failed to delete item", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                Toast.makeText(requireContext(), "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}