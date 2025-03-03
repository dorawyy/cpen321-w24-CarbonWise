package com.example.carbonwise.ui.history

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.MainActivity
import com.example.carbonwise.R
import com.example.carbonwise.databinding.FragmentHistoryBinding
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.EcoscoreResponse
import com.example.carbonwise.ui.info.InfoFragment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

        val recyclerView = binding.recyclerViewHistory
        recyclerView.layoutManager = LinearLayoutManager(context)

        historyAdapter = HistoryAdapter(
            onProductClick = { productId ->
                openProductInfoFragment(productId)
            },
            onDeleteClick = { scanUuid ->
                deleteHistoryItem(scanUuid)
            }
        )
        recyclerView.adapter = historyAdapter

        fetchHistory()

        return root
    }

    override fun onResume() {
        super.onResume()
        fetchHistory()
    }

    private fun fetchHistory() {
        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty()) {
            Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch(Dispatchers.IO) {
            var cachedHistory = HistoryCacheManager.loadHistoryFromCache(requireContext())

            withContext(Dispatchers.Main) {
                cachedHistory?.let { historyAdapter.submitList(it) }

                // Only fetch ecoscore if history exists
                if (!cachedHistory.isNullOrEmpty()) {
                    fetchEcoscore()
                } else {
                    binding.circularContainer.visibility = View.GONE
                }

                binding.textViewEmptyHistory.visibility = if (cachedHistory.isNullOrEmpty()) View.VISIBLE else View.GONE
                if (!cachedHistory.isNullOrEmpty()) fetchEcoscore()
            }

            // Fetch fresh history in the background
            if (!HistoryCacheManager.isCacheValid(requireContext())) {
                HistoryCacheManager.fetchHistoryInBackground(requireContext())
                cachedHistory = HistoryCacheManager.loadHistoryFromCache(requireContext())

                withContext(Dispatchers.Main) {
                    cachedHistory?.let { historyAdapter.submitList(it) }
                    binding.textViewEmptyHistory.visibility = if (cachedHistory.isNullOrEmpty()) View.VISIBLE else View.GONE
                    if (!cachedHistory.isNullOrEmpty()) fetchEcoscore()
                }
            }
        }
    }


    private fun fetchEcoscore() {
        if (_binding == null) return

        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty()) return

        Log.d("HistoryFragment", "Fetching ecoscore...")

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)
        val call = apiService.getScore(token)

        call.enqueue(object : Callback<EcoscoreResponse> {
            override fun onResponse(call: Call<EcoscoreResponse>, response: Response<EcoscoreResponse>) {
                if (_binding == null) return

                if (response.isSuccessful) {
                    val ecoscore = response.body()?.ecoscoreScore

                    if (ecoscore != null && ecoscore > 0) {
                        Log.d("HistoryFragment", "Ecoscore fetched: $ecoscore")

                        val formattedEcoscore = "${String.format("%d", ecoscore.toInt())}"
                        // Only update UI if the value is different to prevent unnecessary flicker
                        if (binding.textEcoscoreValue.text != formattedEcoscore) {
                            binding.textEcoscoreValue.text = formattedEcoscore
                        }

                        binding.progressEcoscore.setProgressCompat(ecoscore.toInt(), false)
                    }
                }
            }

            override fun onFailure(call: Call<EcoscoreResponse>, t: Throwable) {
                Log.e("HistoryFragment", "Network error: ${t.message}")
            }
        })
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