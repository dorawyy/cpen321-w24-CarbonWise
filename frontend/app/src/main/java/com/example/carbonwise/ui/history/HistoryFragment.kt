package com.example.carbonwise.ui.history

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContentProviderCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.MainActivity
import com.example.carbonwise.databinding.FragmentHistoryBinding


class HistoryFragment : Fragment() {

    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!
    private lateinit var historyAdapter: HistoryAdapter

    private val historyViewModel: HistoryViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHistoryBinding.inflate(inflater, container, false)
        val root: View = binding.root

        val recyclerView = binding.recyclerViewHistory
        recyclerView.layoutManager = LinearLayoutManager(context)
        historyAdapter = HistoryAdapter(
            onProductClick = { productId -> openProductInfoFragment(productId) },
            onDeleteClick = { scanUuid ->
                val token = MainActivity.getJWTToken(requireContext())
                if (!token.isNullOrEmpty()) {
                    val builder = android.app.AlertDialog.Builder(requireContext())
                    builder.setTitle("Delete Item")
                    builder.setMessage("Are you sure you want to delete this item?")
                    builder.setPositiveButton("Delete") { _, _ ->
                        historyViewModel.removeHistoryItem(token, scanUuid)
                    }
                    builder.setNegativeButton("Cancel") { dialog, _ ->
                        dialog.dismiss()
                    }
                    builder.show()
                } else {
                    Toast.makeText(context, "No JWT token found", Toast.LENGTH_SHORT).show()
                }
            }
        )
        recyclerView.adapter = historyAdapter

        historyViewModel.historyItems.observe(viewLifecycleOwner) { history ->
            historyAdapter.submitList(history)
            binding.textViewEmptyHistory.visibility = if (history.isEmpty()) View.VISIBLE else View.GONE
        }

        historyViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        historyViewModel.ecoScore.observe(viewLifecycleOwner) { score ->
            if (score > 0) {
                binding.ecoScoreCard.visibility = View.VISIBLE
                binding.textEcoscoreValue.text = score.toInt().toString()
                binding.progressEcoscore.setProgress(score.toInt(), true)
            } else {
                binding.ecoScoreCard.visibility = View.INVISIBLE
            }
        }

        historyViewModel.networkFailure.observe(viewLifecycleOwner) { failure ->
            if (failure) {
                Toast.makeText(context, "Network error, please try again later", Toast.LENGTH_SHORT).show()
                historyViewModel.networkFailure.value = false
            }
        }

        val token = MainActivity.getJWTToken(requireContext())
        if (!token.isNullOrEmpty()) {
            historyViewModel.fetchHistory(token)
            historyViewModel.fetchEcoScore(token)
        }

        return root
    }

    private fun openProductInfoFragment(upcCode: String) {
        val action = HistoryFragmentDirections.actionHistoryFragmentToInfoFragment(upcCode)
        findNavController().navigate(action)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
