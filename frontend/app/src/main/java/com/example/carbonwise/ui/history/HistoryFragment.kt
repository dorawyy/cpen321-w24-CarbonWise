package com.example.carbonwise.ui.history

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.databinding.FragmentHistoryBinding
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.HistoryItem
import com.example.carbonwise.MainActivity
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
    ): View? {
        _binding = FragmentHistoryBinding.inflate(inflater, container, false)
        val root: View = binding.root

        val recyclerView: RecyclerView = binding.recyclerViewHistory
        recyclerView.layoutManager = LinearLayoutManager(context)
        historyAdapter = HistoryAdapter()
        recyclerView.adapter = historyAdapter

        fetchHistory()

        return root
    }

    private fun fetchHistory() {
        val token = MainActivity.getJWTToken(requireContext())

        if (token.isNullOrEmpty()) {
            Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
            return
        }

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)

        val call = apiService.getHistory(token, fetchProductDetails = true)

        call.enqueue(object : Callback<List<HistoryItem>> {
            override fun onResponse(call: Call<List<HistoryItem>>, response: Response<List<HistoryItem>>) {
                if (response.isSuccessful) {
                    val rawResponse = response.body()
                    Log.d("HistoryFragment", "Raw API response: $rawResponse")

                    rawResponse?.let { historyItems ->
                        val allProducts = historyItems.flatMap { it.products.map { it.product } }
                        historyAdapter.submitList(allProducts)
                    }
                } else {
                    Toast.makeText(context, "Failed to load history. Status code: ${response.code()}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<List<HistoryItem>>, t: Throwable) {
                Toast.makeText(context, "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
