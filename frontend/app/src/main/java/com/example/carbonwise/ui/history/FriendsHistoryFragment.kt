package com.example.carbonwise.ui.history

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.databinding.FragmentHistoryBinding
import com.example.carbonwise.MainActivity
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.HistoryItem
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory

class FriendsHistoryFragment : Fragment() {


    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!
    private lateinit var historyAdapter: HistoryAdapter
    private var friendUuid: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val args: FriendsHistoryFragmentArgs? = arguments?.let { FriendsHistoryFragmentArgs.fromBundle(it) }
        friendUuid = args?.friendUuid ?: arguments?.getString("friendUuid")

        if (friendUuid.isNullOrEmpty()) {
            Log.e("FriendsHistoryFragment", "No friend UUID provided")
        } else {
            Log.d("FriendsHistoryFragment", "Friend UUID received: $friendUuid")
        }
    }


    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHistoryBinding.inflate(inflater, container, false)
        val root: View = binding.root

        // Set up RecyclerView
        val recyclerView = binding.recyclerViewHistory
        recyclerView.layoutManager = LinearLayoutManager(context)

        // Initialize the adapter and set click listener
        historyAdapter = HistoryAdapter { upcCode ->
            openProductInfoFragment(upcCode)
        }
        recyclerView.adapter = historyAdapter

        // Fetch friend's history
        fetchFriendHistory()

        return root
    }

    private fun fetchFriendHistory() {
        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty()) {
            Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
            Log.e("FriendsHistoryFragment", "No JWT token found")
            return
        }

        friendUuid?.let { uuid ->
            Log.d("FriendsHistoryFragment", "Fetching history for UUID: $uuid")

            val retrofit = Retrofit.Builder()
                .baseUrl("https://api.cpen321-jelx.com/")
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val apiService = retrofit.create(ApiService::class.java)
            val call = apiService.getFriendHistoryByUUID(token, uuid)

            call.enqueue(object : Callback<List<HistoryItem>> {
                override fun onResponse(call: Call<List<HistoryItem>>, response: Response<List<HistoryItem>>) {
                    if (response.isSuccessful) {
                        Log.d("FriendsHistoryFragment", "API Response Successful: ${response.body()}")

                        response.body()?.let { historyItems ->
                            historyItems.forEach { historyItem ->
                                historyItem.products.forEach { productHistory ->
                                    val product = productHistory.product
                                    Log.d("FriendsHistoryFragment", "Product ID: ${product.productId}, Name: ${product.productName}")
                                }
                            }

                            val allProducts = historyItems.flatMap { it.products }
                                .sortedByDescending { it.timestamp }
                                .map { it.product }

                            historyAdapter.submitList(allProducts)
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        Log.e("FriendsHistoryFragment", "API Error: ${response.code()}, Body: $errorBody")
                        Toast.makeText(context, "Failed to load friend's history: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: Call<List<HistoryItem>>, t: Throwable) {
                    Log.e("FriendsHistoryFragment", "Network error: ${t.message}")
                    Toast.makeText(context, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
        } ?: run {
            Log.e("FriendsHistoryFragment", "No friend UUID provided, cannot fetch history")
            Toast.makeText(context, "No friend UUID provided", Toast.LENGTH_SHORT).show()
        }
    }


    private fun openProductInfoFragment(upcCode: String) {
        val action = FriendsHistoryFragmentDirections
            .actionFriendsHistoryFragmentToInfoFragment(upcCode)

        findNavController().navigate(action)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_FRIEND_UUID = "friendUuid"
    }

}
