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
import com.example.carbonwise.MainActivity
import com.example.carbonwise.databinding.FragmentHistoryBinding
import com.example.carbonwise.network.FriendsApiService
import com.example.carbonwise.network.EcoscoreResponse
import com.example.carbonwise.network.HistoryItem
import com.example.carbonwise.network.ProductNotificationRequest
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
class FriendsHistoryFragment : Fragment() {

    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!
    private lateinit var historyAdapter: FriendsHistoryAdapter
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
        historyAdapter = FriendsHistoryAdapter(
            onProductClick = { upcCode -> openProductInfoFragment(upcCode) },
            onReactClick = { scanUuid, reactionType -> sendReaction(scanUuid, reactionType) }
        )
        recyclerView.adapter = historyAdapter

        // Fetch friend's history and score
        fetchFriendHistory()

        return root
    }

    private fun fetchFriendHistory() {
        if (_binding == null) return
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

            val apiService = retrofit.create(FriendsApiService::class.java)
            val call = apiService.getFriendHistoryByUUID(token, uuid)

            call.enqueue(object : Callback<List<HistoryItem>> {
                override fun onResponse(call: Call<List<HistoryItem>>, response: Response<List<HistoryItem>>) {
                    if (_binding == null) return
                    if (response.isSuccessful) {
                        Log.d("FriendsHistoryFragment", "API Response Successful: ${response.body()}")

                        response.body()?.let { historyItems ->
                            historyAdapter.submitList(historyItems)
                            binding.progressBar.visibility = View.GONE
                            binding.textViewEmptyHistory.visibility = if (historyItems.isNullOrEmpty()) View.VISIBLE else View.GONE
                            val hasValidProducts = historyItems.any { it.products.isNotEmpty() }
                            if (hasValidProducts) {
                                fetchFriendEcoscore()
                                binding.textViewEmptyHistory.visibility = View.GONE
                            } else {
                                binding.circularContainer.visibility = View.GONE
                                binding.ecoScoreCard.visibility = View.GONE
                                binding.textViewEmptyHistory.visibility = View.VISIBLE
                            }
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        Log.e("FriendsHistoryFragment", "API Error: ${response.code()}, Body: $errorBody")
                        Toast.makeText(context, "Failed to load friend's history: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: Call<List<HistoryItem>>, t: Throwable) {
                    if (_binding == null) return
                    Log.e("FriendsHistoryFragment", "Network error: ${t.message}")
                    Toast.makeText(context, "Network error, please try again later", Toast.LENGTH_SHORT).show()
                }
            })
        } ?: run {
            Log.e("FriendsHistoryFragment", "No friend UUID provided, cannot fetch history")
            Toast.makeText(context, "No friend UUID provided", Toast.LENGTH_SHORT).show()
        }
    }

    private fun fetchFriendEcoscore() {
        if (_binding == null) return
        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty() || friendUuid.isNullOrEmpty()) {
            binding.circularContainer.visibility = View.GONE
            return
        }

        Log.d("FriendsHistoryFragment", "Fetching ecoscore for friend: $friendUuid")

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(FriendsApiService::class.java)
        val call = apiService.getFriendEcoscore(token, friendUuid!!)

        call.enqueue(object : Callback<EcoscoreResponse> {
            override fun onResponse(call: Call<EcoscoreResponse>, response: Response<EcoscoreResponse>) {
                if (_binding == null) return
                if (response.isSuccessful) {
                    val ecoscore = response.body()?.ecoscoreScore
                    if (ecoscore != null && ecoscore > 0) {
                        Log.d("FriendsHistoryFragment", "Friend's Ecoscore fetched successfully: $ecoscore")
                        binding.labelEcoscore.text = "Friend's Ecoscore"
                        binding.labelEcoscore.visibility = View.VISIBLE
                        binding.ecoScoreCard.visibility = View.VISIBLE

                        binding.progressEcoscore.setProgressCompat(ecoscore.toInt(), false)
                        binding.textEcoscoreValue.text = ecoscore.toInt().toString()
                    } else {
                        Log.d("FriendsHistoryFragment", "No ecoscore available for friend")
                        binding.circularContainer.visibility = View.GONE
                        binding.ecoScoreCard.visibility = View.GONE
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("FriendsHistoryFragment", "API Error: ${response.code()}, Body: $errorBody")
                    binding.circularContainer.visibility = View.GONE
                    binding.ecoScoreCard.visibility = View.GONE
                }
            }

            override fun onFailure(call: Call<EcoscoreResponse>, t: Throwable) {
                if (_binding == null) return
                Log.e("FriendsHistoryFragment", "Network error: ${t.message}")
                binding.circularContainer.visibility = View.GONE
            }
        })
    }


    private fun sendReaction(scan_uuid: String, reactionType: String) {
        if (_binding == null) return
        val token = MainActivity.getJWTToken(requireContext())

        if (token.isNullOrEmpty()) {
            Log.e("sendReaction", "No JWT token found.")
            Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
            return
        }

        Log.d("sendReaction", "JWT Token retrieved successfully.")

        friendUuid?.let { uuid ->
            Log.d("sendReaction", "Friend UUID found: $uuid")

            val request = ProductNotificationRequest(
                user_uuid = uuid,
                scan_uuid = scan_uuid,
                message_type = reactionType
            )

            Log.d("sendReaction", "Created request: $request")

            val apiService = Retrofit.Builder()
                .baseUrl("https://api.cpen321-jelx.com/")
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(FriendsApiService::class.java)

            Log.d("sendReaction", "Sending request to API...")

            apiService.sendProductNotification(token, request).enqueue(object : Callback<Void> {
                override fun onResponse(call: Call<Void>, response: Response<Void>) {
                    if (_binding == null) return
                    if (response.isSuccessful) {
                        Toast.makeText(context, "Reaction sent!", Toast.LENGTH_SHORT).show()
                    } else {
                        Log.e("sendReaction", "Failed to send reaction: HTTP ${response.code()} - ${response.errorBody()?.string()}")
                        Toast.makeText(context, "Failed to send reaction", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: Call<Void>, t: Throwable) {
                    if (_binding == null) return
                    Log.e("sendReaction", "Network error: ${t.message}", t)
                    Toast.makeText(context, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
        } ?: Log.e("sendReaction", "Friend UUID is null, cannot send reaction.")
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
}
